import json
import logging
from collections import defaultdict
from collections.abc import AsyncGenerator

from app.llm.client import llm_client
from app.schemas.models import Language, Profile

logger = logging.getLogger(__name__)


class AdvisorService:
    """Context-aware AI advisor with conversation memory."""
    
    def __init__(self):
        # In-memory conversation store (session_id -> list of messages)
        # In production, this would use Redis or DB
        self._conversations: dict[str, list[dict]] = defaultdict(list)
    
    async def chat(
        self,
        message: str,
        session_id: str | None,
        profile: Profile | None,
        report_summary: dict | None,
        lang: Language
    ) -> AsyncGenerator[str, None]:
        """Stream a response from the AI advisor."""
        sid = session_id or "default"
        
        # Add user message to history
        self._conversations[sid].append({
            "role": "user",
            "content": message
        })
        
        # Keep only last 10 turns
        history = self._conversations[sid][-20:]  # 10 turns = 20 messages
        
        # Build structured entrepreneur context
        profile_parts = []
        if profile:
            profile_parts.append(f"- Location: {profile.district}, {profile.state} (Village: {profile.village or 'Rural cluster'})")
            if isinstance(profile.capital, (int, float)):
                profile_parts.append(f"- Personal Savings / Equity Capital: ₹{profile.capital:,.0f}")
            else:
                profile_parts.append(f"- Personal Savings / Equity Capital: ₹{profile.capital}")
            profile_parts.append(f"- Category: {profile.category.upper()} | Gender: {profile.gender.upper()} | Age: {profile.age}")
            collateral_val = getattr(profile, "has_collateral", getattr(profile, "collateral", False))
            first_time_val = getattr(profile, "first_time_borrower", True)
            profile_parts.append(f"- Experience: {profile.experience} | Collateral Available: {'Yes' if collateral_val else 'No'} | First-time borrower: {'Yes' if first_time_val else 'No'}")
        profile_str = "\n".join(profile_parts) if profile_parts else "Basic entrepreneur profile"

        # Format enterprise details
        rep = report_summary or {}
        business_type = rep.get("business_type", "Rural Enterprise")
        products = rep.get("products", [])
        products_str = ", ".join(products) if isinstance(products, list) and products else "Standard business offerings"
        target_customer = rep.get("target_customer") or "Local community and regional traders"

        # Discovery & resource details
        disc = rep.get("discovery") or {}
        res_parts = []
        if disc.get("space"):
            res_parts.append(f"Space: {disc['space']}")
        if disc.get("electricity") is not None:
            res_parts.append(f"Electricity: {'Yes' if disc['electricity'] else 'No'}")
        if disc.get("water") is not None:
            res_parts.append(f"Water: {'Yes' if disc['water'] else 'No'}")
        if disc.get("skills"):
            res_parts.append(f"Skills: {', '.join(disc['skills'])}")
        resources_str = " | ".join(res_parts) if res_parts else "Standard village facility"

        # Financial breakdown
        inv = rep.get("investment") or {}
        inv_total = inv.get("total") if isinstance(inv, dict) else inv
        if isinstance(inv_total, (int, float)):
            inv_str = f"₹{inv_total:,.0f}"
        else:
            inv_str = str(inv_total or "₹2,86,000")

        gap_info = rep.get("funding_gap") or rep.get("gap") or {}
        gap_val = gap_info.get("gap") if isinstance(gap_info, dict) else gap_info
        if isinstance(gap_val, (int, float)):
            gap_str = f"₹{gap_val:,.0f}"
        else:
            gap_str = str(gap_val or "₹2,36,000")

        cap_val = profile.capital if profile else 50000
        cap_str = f"₹{cap_val:,.0f}" if isinstance(cap_val, (int, float)) else str(cap_val)

        # Repayment details
        rep_fin = rep.get("repayment") or {}
        emi_val = rep_fin.get("emi")
        tenure_val = rep_fin.get("tenure_months") or 60
        rate_val = rep_fin.get("annual_rate_pct") or 9.5
        dscr_val = rep_fin.get("dscr") or 1.4
        repayment_str = (
            f"EMI: ₹{emi_val:,.0f}/month (Tenure: {tenure_val} mo @ {rate_val}% p.a., DSCR: {dscr_val})"
            if emi_val else f"Estimated EMI: ~₹4,900 - ₹5,400/month (60 mo tenure @ 9.5%, DSCR: 1.4)"
        )

        # Projections
        proj = rep.get("projection") or {}
        be_month = proj.get("break_even_month") or proj.get("break_even_note") or "Month 3 to 4"
        breakeven_str = f"Break-even: {be_month}"
        if proj.get("annual_revenue"):
            breakeven_str += f" | Projected Year 1 Revenue: ₹{proj['annual_revenue']:,.0f}"

        # Matched schemes
        schemes_raw = rep.get("schemes", [])
        if isinstance(schemes_raw, list) and schemes_raw:
            schemes_lines = []
            for s in schemes_raw:
                if isinstance(s, dict):
                    name = s.get("name") or s.get("scheme_name") or "Scheme"
                    sub = s.get("subsidy") or ""
                    ben = s.get("benefits") or ""
                    schemes_lines.append(f"- {name}: {sub} {ben}".strip())
                elif isinstance(s, str):
                    schemes_lines.append(f"- {s}")
            schemes_str = "\n".join(schemes_lines)
        else:
            schemes_str = "- Pradhan Mantri Mudra Yojana (Kishore - Collateral Free)\n- PMEGP (KVIC Capital Subsidy 25%-35%)"

        # Market & competitors
        market_info = rep.get("market") or {}
        demand = market_info.get("demand") or "High local consumer off-take"
        competitors = market_info.get("competitors")
        market_str = f"Demand: {demand}"
        if isinstance(competitors, dict):
            market_str += f" | Competitor density: {competitors.get('density', 'moderate')}"

        report_full_str = json.dumps(rep, indent=2, ensure_ascii=False) if rep else "No full report generated yet"

        variables = {
            "profile": profile_str,
            "profile_data": profile.model_dump() if profile else {},
            "report_data": rep,
            "business_summary": business_type,
            "products_summary": products_str,
            "target_customer": target_customer,
            "resources_summary": resources_str,
            "score": str(rep.get("score") or "74"),
            "verdict": str(rep.get("verdict") or "Feasible with Conditions"),
            "investment_summary": inv_str,
            "capital_summary": cap_str,
            "gap_summary": gap_str,
            "repayment_summary": repayment_str,
            "breakeven_summary": breakeven_str,
            "schemes_summary": schemes_str,
            "market_summary": market_str,
            "report_summary": report_full_str,
            "history": json.dumps(history, indent=2, ensure_ascii=False),
            "message": message,
        }
        
        collected_response = ""
        async for chunk in llm_client.stream_text(
            prompt_name="advisor_chat",
            variables=variables,
            lang=lang.value,
            max_tokens=1500
        ):
            collected_response += chunk
            yield chunk
        
        # Save assistant response to history
        self._conversations[sid].append({
            "role": "assistant",
            "content": collected_response
        })


advisor_service = AdvisorService()
