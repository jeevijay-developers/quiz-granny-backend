# CSV Import Format for Questions

## Overview

This document describes the expected CSV format for bulk importing questions. The format matches the export format to allow easy re-import of exported data.

## CSV Column Headers

### Mandatory Fields

- `title_text` - The question text (required, cannot be empty)
- `option1_text` - First option text (required)
- `option2_text` - Second option text (required)
- `correctAnswer_index` - Index of correct answer (required, 0-based number)
- `difficulty` - Question difficulty (1-5, defaults to 3 if invalid)

### Optional Fields

- `_id` - Question ID (ignored on import, used only for reference)
- `title_image` - URL to question image
- `option1_image` - URL to option 1 image
- `option2_image` - URL to option 2 image
- `option3_text` - Third option text
- `option3_image` - URL to option 3 image
- `option4_text` - Fourth option text
- `option4_image` - URL to option 4 image
- `explanation_text` - Explanation text for the answer
- `explanation_image` - URL to explanation image
- `categories` - Comma-separated category names or IDs
- `isApproved` - Approval status (ignored on import, defaults to false)
- `approvedBy_username` - Username who approved (ignored on import)
- `approvedBy_email` - Email of approver (ignored on import)
- `createdBy_username` - Username of creator (system will lookup user)
- `createdBy_email` - Email of creator (for reference only)
- `createdAt` - Creation timestamp (ignored on import)
- `updatedAt` - Update timestamp (ignored on import)

## Validation Rules

### Question Title

- Must not be empty
- Must be unique (duplicates will be skipped)

### Options

- Minimum 2 options required
- Maximum 4 options supported
- At least option1_text and option2_text must have values

### Correct Answer

- Must be a number (0-based index)
- Must be within the range of provided options
- Example: If you have 3 options, valid values are 0, 1, or 2

### Difficulty

- Must be a number between 1 and 5
- 1 = Very Easy
- 2 = Easy
- 3 = Medium (default)
- 4 = Hard
- 5 = Very Hard

### Categories

- Can be comma-separated category names or ObjectIds
- **All categories must exist in the database** (strict validation)
- System will attempt to match category names first (case-sensitive)
- If name not found, tries to match as ObjectId
- If ANY category in the list doesn't exist, the entire row fails with error
- Empty categories field is allowed (question created without categories)
- Leading/trailing spaces in category names are automatically trimmed

### Creator

- If `createdBy_username` is provided, system will lookup the user
- If user not found, question is created without creator reference
- If not provided and request has authenticated user, uses that user

## Import Behavior

### Successful Import

- Question is created with all valid fields
- Returns the created question object with populated references

### Skipped Records

- Questions with duplicate titles (same title_text already exists)
- Record is not inserted but counted in the summary

### Failed Records

- Missing mandatory fields (title_text, options, correctAnswer_index)
- Invalid correctAnswer_index (out of range)
- Less than 2 options provided
- Invalid categories (any category name that doesn't exist in database)
- Any other validation or database errors
- Record is not inserted and error reason is provided

## Response Format

```json
{
  "success": true,
  "message": "Bulk import completed",
  "summary": {
    "total": 100,
    "successful": 85,
    "failed": 10,
    "skipped": 5
  },
  "results": {
    "successful": [
      {
        "row": 2,
        "question": {
          /* full question object */
        }
      }
    ],
    "failed": [
      {
        "row": 15,
        "data": {
          /* original CSV row data */
        },
        "reason": "At least 2 options are required"
      }
    ],
    "skipped": [
      {
        "row": 23,
        "title": "What is JavaScript?",
        "reason": "Question with same title already exists"
      }
    ]
  }
}
```

## Sample CSV

```csv
title_text,title_image,option1_text,option1_image,option2_text,option2_image,option3_text,option3_image,option4_text,option4_image,correctAnswer_index,explanation_text,explanation_image,difficulty,categories
"What is the capital of France?","","Paris","","London","","Berlin","","Madrid","",0,"Paris is the capital and most populous city of France.","",2,"Geography, Europe"
"What is 2 + 2?","","3","","4","","5","","6","",1,"Basic addition: 2 + 2 equals 4.","",1,"Mathematics, Arithmetic"
```

## Tips

1. **Export First**: Export existing questions to see the exact format
2. **Use Quotes**: Wrap text fields in quotes if they contain commas or newlines
3. **Test Small Batch**: Import a few questions first to verify format
4. **Check Console**: Failed/skipped records are logged to browser console
5. **Unique Titles**: Ensure question titles are unique to avoid skips
6. **Category Names**: Use exact category names (case-sensitive) for proper matching
7. **Image URLs**: If using images, provide full URLs (e.g., from Cloudinary)
8. **UTF-8 Encoding**: Save CSV with UTF-8 encoding to support special characters

## Common Errors

| Error Message                                                    | Cause                                   | Solution                                                |
| ---------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| "Question title text is required"                                | Empty or missing title_text             | Provide non-empty title_text                            |
| "At least 2 options are required"                                | Less than 2 options with text           | Add option1_text and option2_text                       |
| "Invalid correct answer index"                                   | correctAnswer_index out of range        | Use 0-based index within option count                   |
| "Question with same title already exists"                        | Duplicate title_text                    | Use unique question titles or edit existing             |
| "Invalid category name(s): [names]. Categories must exist..."    | Category doesn't exist in database      | Create categories first or use correct existing names   |
