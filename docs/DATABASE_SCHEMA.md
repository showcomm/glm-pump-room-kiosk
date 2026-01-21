# Database Schema for Pump Room Kiosk

This document outlines the Supabase database schema for the kiosk system.

## Tables

### `kiosk_projects`
Top-level container for a kiosk experience.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Project name |
| description | text | Project description |
| aspect_ratio | text | Target display ratio (e.g., "4:3") |
| is_published | boolean | Whether kiosk is live |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### `kiosk_scenes`
Individual screens/views within a project.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | uuid | FK to kiosk_projects |
| name_en | text | English name |
| name_fr | text | French name |
| scene_type | text | 'home', 'explore', 'animation', etc. |
| master_image_url | text | Background image URL |
| sort_order | int | Display order |
| is_active | boolean | Whether scene is enabled |

### `kiosk_equipment`
Interactive equipment items.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| scene_id | uuid | FK to kiosk_scenes |
| name_en | text | English name |
| name_fr | text | French name |
| description_en | text | English description |
| description_fr | text | French description |
| function_en | text | English function text |
| function_fr | text | French function text |
| specifications_en | text | English specs |
| specifications_fr | text | French specs |
| year_installed | int | Installation year |
| manufacturer | text | Manufacturer name |
| color_category | text | 'pump', 'steam', 'discharge', etc. |
| hotspot_shape | text | 'circle', 'rectangle', 'polygon' |
| hotspot_coordinates | jsonb | Shape coordinates |
| sort_order | int | Display order |

### `kiosk_gallery_photos`
Archival photographs.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | uuid | FK to kiosk_projects |
| image_url | text | Full image URL |
| thumbnail_url | text | Thumbnail URL |
| title_en | text | English title |
| title_fr | text | French title |
| description_en | text | English description |
| description_fr | text | French description |
| year | int | Photo year |
| era | text | 'construction', 'early', 'wwii', etc. |
| source | text | Attribution |
| sort_order | int | Display order |

### `kiosk_quiz_questions`
Quiz mode questions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | uuid | FK to kiosk_projects |
| question_en | text | English question |
| question_fr | text | French question |
| correct_equipment_id | uuid | FK to kiosk_equipment |
| hint_en | text | English hint |
| hint_fr | text | French hint |
| explanation_en | text | English explanation |
| explanation_fr | text | French explanation |
| difficulty | text | 'easy', 'medium', 'hard' |
| sort_order | int | Question order |

## Row Level Security

For the pump room kiosk, RLS can be simplified since it's a public display:

- **Read**: Public access for all kiosk tables
- **Write**: Authenticated users with admin role only

## Notes

- All text content stored in EN/FR pairs
- Image URLs point to Dropbox (converted for direct access)
- Coordinates stored as JSONB for flexibility
- Sort order allows manual arrangement
