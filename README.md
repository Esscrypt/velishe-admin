# Modeling Portfolio Admin Panel

Admin panel for managing models in the modeling portfolio database.

## Features

- ✅ CRUD operations for models
- ✅ Image upload with automatic resizing (Sharp)
- ✅ Drag-and-drop reordering of models
- ✅ Real-time updates

## Setup

1. Install dependencies:
```bash
bun install
```

2. Generate password hash:
```bash
bun run generate-password-hash <your-password>
```

3. Create a `.env` file:
```
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_PASSWORD_HASH=<hash-from-step-2>
```

3. Run the development server:
```bash
bun run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Usage

### Adding a Model
1. Click "Add Model"
2. Fill in the form (ID, slug, name, stats, etc.)
3. Upload a featured image (will be resized to 1200x1600)
4. Click "Save"

### Editing a Model
1. Click the edit icon on any model
2. Modify the fields
3. Click "Save"

### Deleting a Model
1. Click the delete icon on any model
2. Confirm the deletion

### Reordering Models
1. Drag models using the grip icon (⋮⋮) on the left
2. Drop them in the desired order
3. The order is automatically saved

### Image Upload
- Images are automatically resized:
  - Featured images: 1200x1600
  - Gallery images: 1080x1440
- Images are converted to WebP format
- Images are saved to `public/models/{slug}/`

## API Routes

- `GET /api/models` - Get all models
- `POST /api/models` - Create a new model
- `GET /api/models/[id]` - Get a specific model
- `PUT /api/models/[id]` - Update a model
- `DELETE /api/models/[id]` - Delete a model
- `POST /api/models/reorder` - Reorder models
- `POST /api/upload` - Upload an image

