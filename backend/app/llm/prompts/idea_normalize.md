You are helping normalise a user's business idea into a structured format.

## User's raw input
"{raw_input}"

## Task
Extract:
1. **business_type**: The closest standard business category (e.g., dairy_small, kirana_store, tailoring, mobile_repair, flour_mill, tiffin_stall, poultry, goat_farming, mushroom_farming, handicraft, e_seva_centre)
2. **scale**: small, medium, or large
3. **products**: List of specific products or services they plan to offer
4. **target_customer**: Who will buy from them
5. **ambiguities**: Any unclear aspects that need clarification
6. **clarifying_questions**: Questions to ask the user to resolve ambiguities
7. **confidence**: How confident you are in the normalization (0-1)

If the input is vague, set confidence low and list clarifying questions.

## Output Schema
{schema_description}
