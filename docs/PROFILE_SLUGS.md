# Profile Slugs Feature

## Overview
This feature adds LinkedIn-style profile URLs to NAAPE, allowing members to share clean, readable profile links using their names instead of MongoDB IDs.

## Examples
- **Before**: `https://naape.org/members/507f1f77bcf86cd799439011`
- **After**: `https://naape.org/members/david-aiyewumi`

## Implementation Details

### Backend Changes

#### 1. User Model (`src/models/User.ts`)
- Added `profileSlug` field (unique, sparse index)
- Added `generateProfileSlug()` method to create URL-friendly slugs
- Auto-generates slugs on user creation or name change
- Handles duplicate slugs by appending numbers (e.g., `john-doe-2`)

#### 2. User Controller (`src/controllers/user.controller.ts`)
- Updated `getPublicProfile()` to accept both MongoDB IDs and slugs
- Automatically detects if parameter is an ID or slug
- Returns profile data with `profileSlug` field

#### 3. Migration Script (`src/scripts/generateProfileSlugs.ts`)
- Generates slugs for existing users without them
- Run with: `npm run generate-slugs`

### Frontend Changes

#### 1. Settings Page (`NAAPE-frontend/components/settings/SettingsPage.tsx`)
- Displays profile link using slug (falls back to ID if no slug)
- Copy to clipboard functionality
- Direct link to view public profile

#### 2. Mobile Profile (`mobile-naape/NAAPE-mobile/app/(screens)/profile/profile.tsx`)
- Shows profile link in a dedicated section
- Copy button with visual feedback
- LinkedIn-style presentation

## Slug Generation Rules

1. Convert name to lowercase
2. Remove special characters (keep letters, numbers, spaces, hyphens)
3. Replace spaces with hyphens
4. Remove consecutive hyphens
5. Check for uniqueness, append number if needed

### Examples:
- "David Aiyewumi" → `david-aiyewumi`
- "John O'Brien" → `john-obrien`
- "María García" → `mara-garca`
- "John Doe" (duplicate) → `john-doe-2`

## API Endpoints

### Get Public Profile
```
GET /api/v1/users/public/:id
```

**Parameters:**
- `id`: Can be either MongoDB ObjectId or profileSlug

**Examples:**
```bash
# Using slug
GET /api/v1/users/public/david-aiyewumi

# Using ID (still works)
GET /api/v1/users/public/507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "message": "Public profile fetched successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "David Aiyewumi",
    "email": "david@example.com",
    "profileSlug": "david-aiyewumi",
    "role": "member",
    "profile": { ... },
    "professional": { ... },
    "stats": {
      "approved": 5
    }
  }
}
```

## Migration Guide

### For Existing Installations

1. **Update the codebase** with the new changes

2. **Run the migration script** to generate slugs for existing users:
   ```bash
   cd NAAPE-backend
   npm run generate-slugs
   ```

3. **Verify the migration**:
   - Check that all users have `profileSlug` values
   - Test accessing profiles via both ID and slug
   - Ensure no duplicate slugs exist

### For New Installations
- Slugs are automatically generated when users register
- No migration needed

## Testing

### Manual Testing Checklist

1. **User Registration**
   - [ ] New users get automatic slugs
   - [ ] Slugs are URL-friendly
   - [ ] Duplicate names get numbered suffixes

2. **Profile Access**
   - [ ] Can access profile via slug: `/members/john-doe`
   - [ ] Can still access via ID: `/members/507f1f77bcf86cd799439011`
   - [ ] 404 for non-existent slugs

3. **Profile Link Display**
   - [ ] Mobile app shows profile link
   - [ ] Web settings page shows profile link
   - [ ] Copy button works correctly
   - [ ] Link format matches LinkedIn style

4. **Name Changes**
   - [ ] Changing name updates slug
   - [ ] Old slug becomes available
   - [ ] No broken links (consider implementing redirects)

## Future Enhancements

1. **Custom Slugs**: Allow users to customize their profile slug
2. **Slug History**: Track old slugs and redirect to new ones
3. **Vanity URLs**: Premium feature for custom domains
4. **Analytics**: Track profile link clicks
5. **QR Codes**: Generate QR codes for profile links

## Security Considerations

- Slugs are public and discoverable
- No sensitive information in slugs
- Rate limiting on profile lookups
- Validation to prevent malicious slugs

## Performance

- Indexed `profileSlug` field for fast lookups
- Sparse index (only for users with slugs)
- Minimal overhead on user creation
- Efficient duplicate checking

## Troubleshooting

### Issue: Users without slugs
**Solution**: Run `npm run generate-slugs`

### Issue: Duplicate slug errors
**Solution**: The system automatically appends numbers. Check for race conditions in concurrent user creation.

### Issue: Special characters in names
**Solution**: Slugs automatically sanitize special characters. Non-ASCII characters are removed.

### Issue: Profile not found via slug
**Solution**: 
1. Verify slug exists in database
2. Check for typos in URL
3. Ensure slug is lowercase
4. Try accessing via ID instead
