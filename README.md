# Next.js + KeystoneJS Starter

A modern full-stack application combining Next.js 15 with KeystoneJS 6, featuring admin dashboard implementation and sophisticated role-based permissions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjunaid33%2Fnext-keystone-starter%2F&stores=[{"type"%3A"postgres"}])

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/TK5wC1?referralCode=I_tWSs)

## Architecture Overview

This project features a **modern admin architecture** with:

- **Backend**: KeystoneJS 6 providing GraphQL API, authentication, and database operations
- **Frontend**: Custom Next.js admin dashboard with enhanced UI components
- **Image Support**: S3-compatible image storage and management 

## Tech Stack

### Frontend
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Radix UI** primitives for accessible components
- **Tailwind CSS 4** for styling
- **Remix Icons** (@remixicon/react) for icons
- **SWR** for client-side data fetching
- **TipTap** for rich text editing
- **React Hook Form** for form management
- **Zod** for schema validation

### Backend
- **KeystoneJS 6** for GraphQL API and admin interface
- **Prisma ORM** for database operations
- **GraphQL Yoga** for GraphQL server
- **PostgreSQL** database
- **S3-compatible storage** for image management

### Key Features
- **Role-based access control** with granular permissions
- **Dynamic field controllers** with conditional behavior
- **Rich text editing** with document fields
- **Relationship management** with inline editing capabilities
- **Image upload and management** with S3 storage
- **Inline create/edit components** for seamless UX
- **Advanced filtering system** for all field types
- **Responsive design** with mobile support

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/junaid33/next-keystone-starter
   cd next-keystone-starter
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your database configuration:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   SESSION_SECRET=your-super-secret-session-key-change-this-in-production
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   This will:
   - Build KeystoneJS schema
   - Run database migrations
   - Start Next.js development server with Turbopack

4. **Access the application:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
   - GraphQL API: [http://localhost:3000/api/graphql](http://localhost:3000/api/graphql)

## Development Commands

- `npm run dev` - Build Keystone + migrate + start Next.js dev server
- `npm run build` - Build Keystone + migrate + build Next.js for production
- `npm run migrate:gen` - Generate and apply new database migrations
- `npm run migrate` - Deploy existing migrations to database
- `npm run lint` - Run ESLint

## API Endpoints

### GraphQL API
- **Endpoint**: `/api/graphql`
- **Features**: Full CRUD operations, relationships, authentication
- **Playground**: Available in development mode

## Data Models

### Core Models
- **User** - Authentication and user management
- **Role** - Role-based access control

### Permission System
Sophisticated role-based permissions including:
- `canAccessDashboard`, `canManagePeople`, `canManageRoles`
- `canManageContent`
- `canSeeOtherPeople`, `canEditOtherPeople`

## Image Management

Images are stored in S3-compatible storage and referenced from Keystone's
`image()` field type. There are two ways an `image()` field shows up in this
project, and which one to reach for depends on the cardinality of images per
record.

### Storage configuration

One named storage target, `my_images`, is declared once in
[`features/keystone/index.ts`](features/keystone/index.ts) and referenced by
key from any `image()` field:

```ts
// features/keystone/index.ts
const {
  S3_BUCKET_NAME: bucketName = "keystone-test",
  S3_REGION: region = "ap-southeast-2",
  S3_ACCESS_KEY_ID: accessKeyId = "keystone",
  S3_SECRET_ACCESS_KEY: secretAccessKey = "keystone",
  S3_ENDPOINT: endpoint = "https://sfo3.digitaloceanspaces.com",
} = process.env;

export default withAuth(
  config({
    // ...
    storage: {
      my_images: {
        kind: "s3",
        type: "image",
        bucketName,
        region,
        accessKeyId,
        secretAccessKey,
        endpoint,
        signed: { expiry: 5000 },   // signed download URLs, valid 5s after issue
        forcePathStyle: true,
      },
    },
  })
);
```

The fallback values are DigitalOcean Spaces test credentials — fine for
`keystone build`, not for real uploads. Set the five `S3_*` env vars for
anything that needs to actually store a file. See `.env.example`.

### Pattern 1 — a single image directly on a list

Use this when a record has exactly one image (a photo, a logo, a cover). Add
an `image()` field pointing at the storage key:

```ts
// features/keystone/models/GalleryItem.ts
import { image } from "@keystone-6/core/fields";

export const GalleryItem = list({
  fields: {
    image: image({ storage: "my_images" }),
    // ...
  },
});
```

### Pattern 2 — many images per record, via a separate list

Use this when a record can have any number of images (a gallery, an
attachment list). Rather than an array field (Keystone has none), model it as
its own list with an `image()` field, connected back by a `relationship()`.
This was `Todo`/`TodoImage`'s pattern before both were removed as
demo-only content — kept here as the reference for the next time this project
needs a one-to-many image relationship:

```ts
// the "many images" list
export const TodoImage = list({
  fields: {
    image: image({ storage: "my_images" }),
    imagePath: text(),
    altText: text(),
    todos: relationship({ ref: "Todo.todoImages", many: true }),
  },
});

// the list that owns them
export const Todo = list({
  fields: {
    todoImages: relationship({
      ref: "TodoImage.todos",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["image", "altText", "imagePath"],
        inlineCreate: { fields: ["image", "altText", "imagePath"] },
        inlineEdit: { fields: ["image", "altText", "imagePath"] },
        inlineConnect: true,
        removeMode: "disconnect",
        linkToItem: false,
      },
    }),
  },
});
```

`displayMode: "cards"` with `inlineCreate`/`inlineEdit` is what lets an editor
upload and caption several images from directly inside the owning record's
item view, instead of navigating to the `TodoImage` list separately.

### What an `image()` field actually returns

Over GraphQL, an `image()` field resolves to an object, not a bare URL —
the dashboard's field controller
([`features/dashboard/views/image/index.tsx`](features/dashboard/views/image/index.tsx))
selects:

```graphql
{
  id
  url
  extension
  filesize
  width
  height
}
```

`url` is what components render; `width`/`height`/`filesize` are read from
the file at upload time, not computed client-side.

### How the dashboard's upload/remove flow works

The image field's `Field` component
([`features/dashboard/views/image/Field.tsx`](features/dashboard/views/image/Field.tsx))
tracks one of four states — `empty`, `from-server`, `upload` (a file staged
but not yet saved), `remove` — and serializes them into the update mutation:

```ts
// features/dashboard/views/image/index.tsx
serialize(value: ImageValue) {
  if (value.kind === 'upload') {
    return { [config.path]: { upload: value.data.file } }  // multipart upload
  }
  if (value.kind === 'remove') {
    return { [config.path]: null }                          // clears the field
  }
  return {}                                                  // unchanged
}
```

Accepted extensions are declared once, in
[`features/dashboard/views/image/utils.ts`](features/dashboard/views/image/utils.ts):
`jpg`, `jpeg`, `png`, `webp`, `gif`.

### Adding a new field type's dashboard view

Every field type used in a list needs a matching entry in
[`features/dashboard/views/registry.ts`](features/dashboard/views/registry.ts)
— an unregistered type throws and breaks the whole item page, not just that
field (see `AGENTS.md`). `image` is already registered; this only matters if
a list reaches for a field type that isn't yet in use anywhere in this
project.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/
│   │   └── graphql.ts     # GraphQL API endpoint
│   └── dashboard/         # Admin dashboard pages
├── features/
│   ├── keystone/          # Backend configuration
│   │   ├── models/        # Keystone list definitions
│   │   ├── access.ts      # Permission logic
│   │   └── mutations/     # Custom GraphQL mutations
│   └── dashboard/         # Admin interface implementation
│       ├── actions/       # Server actions
│       ├── components/    # Reusable UI components
│       ├── screens/       # Page-level components
│       └── views/         # Field type implementations
├── keystone.ts            # KeystoneJS configuration
└── schema.prisma          # Database schema
```

## Development Notes

- **GraphQL endpoint** available at `/api/graphql`
- **Field implementations** follow KeystoneJS controller patterns
- **Permission checks** are integrated throughout the UI layer
- **Server actions** used for data mutations in dashboard components
- **Inline editing** components provide seamless UX for relationship management
- **Image uploads** configured for S3-compatible storage
- **Advanced filtering** supports all field types including documents, JSON, and images

## Deployment

The application can be deployed to any platform supporting Node.js and PostgreSQL:

1. Set up PostgreSQL database
2. Configure environment variables
3. Run `npm run build`
4. Run `npm start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request