import logging

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/i18n", tags=["Internationalization"])

# Placeholder UI strings - in production these would be in JSON files or DB
UI_STRINGS = {
    "en": {
        "app_name": "GramUdyam AI",
        "tagline": "Your AI-powered business planning assistant",
        "start_button": "Start Your Journey",
        "discover_title": "Choose Your Business",
        "profile_title": "Tell Us About You",
        "analysis_title": "Local Market Analysis",
        "finance_title": "Investment & Finance",
        "report_title": "Feasibility Report",
        "dashboard_title": "Your Dashboard",
        "compare_title": "Compare Options",
        "documents_title": "Document Checklist",
        "advisor_title": "AI Business Advisor",
        "download_pdf": "Download PDF",
        "ask_advisor": "Ask AI Advisor",
    },
    "hi": {
        "app_name": "ग्रामउद्यम AI",
        "tagline": "आपका AI-संचालित व्यापार नियोजन सहायक",
        "start_button": "अपनी यात्रा शुरू करें",
        "discover_title": "अपना व्यवसाय चुनें",
        "profile_title": "अपने बारे में बताएं",
        "analysis_title": "स्थानीय बाज़ार विश्लेषण",
        "finance_title": "निवेश और वित्त",
        "report_title": "व्यवहार्यता रिपोर्ट",
        "dashboard_title": "आपका डैशबोर्ड",
        "compare_title": "विकल्पों की तुलना",
        "documents_title": "दस्तावेज़ चेकलिस्ट",
        "advisor_title": "AI व्यापार सलाहकार",
        "download_pdf": "PDF डाउनलोड करें",
        "ask_advisor": "AI सलाहकार से पूछें",
    },
    "mr": {
        "app_name": "ग्रामउद्यम AI",
        "tagline": "तुमचा AI-संचालित व्यवसाय नियोजन सहाय्यक",
        "start_button": "तुमचा प्रवास सुरू करा",
        "discover_title": "तुमचा व्यवसाय निवडा",
        "profile_title": "तुमच्याबद्दल सांगा",
        "analysis_title": "स्थानिक बाजार विश्लेषण",
        "finance_title": "गुंतवणूक आणि वित्त",
        "report_title": "व्यवहार्यता अहवाल",
        "dashboard_title": "तुमचा डॅशबोर्ड",
        "compare_title": "पर्यायांची तुलना",
        "documents_title": "कागदपत्र चेकलिस्ट",
        "advisor_title": "AI व्यवसाय सल्लागार",
        "download_pdf": "PDF डाउनलोड करा",
        "ask_advisor": "AI सल्लागाराला विचारा",
    }
}


@router.get("/{lang}")
async def get_ui_strings(lang: str):
    """Get localized UI strings for the frontend."""
    if lang not in UI_STRINGS:
        raise HTTPException(status_code=404, detail=f"Language '{lang}' not supported. Available: en, hi, mr")
    return UI_STRINGS[lang]
