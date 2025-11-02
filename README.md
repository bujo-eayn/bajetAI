# bajetAI

> AI-Powered Budget Transparency Platform for County & National Governments

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com/)

## Overview

**bajetAI** is a web-based platform that enables county or national budget offices to:

- Upload budget documents (PDFs)
- Automatically generate summaries and Swahili translations using AI
- Publish summarized documents for public viewing
- Collect and analyze citizen comments with automated categorization
- Help officials review feedback efficiently through AI-powered insights

The platform uses **free and open-source AI models** via Hugging Face Inference API, making it cost-effective and accessible for government agencies.

## Features

### For Budget Officials
- Secure authentication and role-based access
- Document upload with automated processing
- AI-generated English summaries
- Automatic Swahili translation
- Comment moderation dashboard
- AI-powered comment categorization and summarization
- Analytics and insights on citizen feedback

### For Citizens
- Public access to budget summaries (no login required)
- View summaries in English and Swahili
- Submit comments and feedback
- Easy-to-understand budget information

## Tech Stack

### Frontend
- **Next.js 14+** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **shadcn/ui** - UI components

### Backend
- **Next.js API Routes** - Serverless API
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - Storage (for PDFs)
  - Row Level Security (RLS)

### AI Processing
- **Hugging Face Inference API** - AI model hosting
- **Models Used:**
  - `facebook/bart-large-cnn` - Summarization
  - `Helsinki-NLP/opus-mt-en-sw` - English to Swahili translation
  - `Helsinki-NLP/opus-mt-sw-en` - Swahili to English translation
  - `facebook/bart-large-mnli` - Comment categorization

### Deployment
- **Vercel** - Hosting and CI/CD
- **GitHub** - Version control

## Project Structure

```
bajetAI/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── upload/              # Document upload
│   │   ├── process-document/    # AI processing
│   │   ├── comments/            # Comment management
│   │   └── analyze-comments/    # Comment analysis
│   ├── (public)/                # Public pages
│   │   ├── page.tsx             # Homepage
│   │   └── documents/           # Document listing
│   ├── (auth)/                  # Auth pages
│   │   ├── login/
│   │   └── signup/
│   └── dashboard/               # Official dashboard
│       ├── page.tsx
│       ├── upload/
│       ├── documents/
│       └── analysis/
├── components/                   # React components
│   ├── ui/                      # UI components (shadcn)
│   ├── auth/                    # Auth components
│   ├── documents/               # Document components
│   └── comments/                # Comment components
├── lib/                         # Utilities
│   ├── supabase/               # Supabase client
│   ├── ai/                     # AI utilities
│   │   ├── summarize.ts
│   │   ├── translate.ts
│   │   └── categorize.ts
│   └── utils/                  # Helper functions
├── types/                       # TypeScript types
├── public/                      # Static assets
├── .env.local                   # Environment variables (not committed)
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Git
- Supabase account (free tier)
- Hugging Face account (free tier)
- Vercel account (optional, for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bajetAI.git
   cd bajetAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and API keys
   - Run the database migrations (see [Database Setup](#database-setup))

4. **Set up Hugging Face**
   - Create account at [huggingface.co](https://huggingface.co)
   - Generate API token from Settings > Access Tokens
   - Copy the token for environment variables

5. **Configure environment variables**

   Create `.env.local` file in the root directory:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Hugging Face
   HUGGING_FACE_API_KEY=your-huggingface-api-key

   # App (optional)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

6. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

### Tables

The application uses the following database tables:

1. **profiles** - User profiles and roles
2. **documents** - Budget documents metadata
3. **comments** - Citizen comments
4. **comment_summaries** - AI-generated comment summaries

### Running Migrations

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL scripts from `/database/migrations/`
4. Enable Row Level Security (RLS) policies

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for detailed schema.

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add comment categorization
fix: resolve PDF upload error
docs: update README with setup instructions
test: add unit tests for summarization
chore: update dependencies
```

### Pull Request Process

1. Create a feature branch from `develop`
2. Make your changes
3. Write/update tests
4. Update documentation if needed
5. Push and create a Pull Request
6. Wait for review and approval
7. Merge to `develop`

## Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run linter
npm run lint

# Type checking
npm run type-check
```

## Deployment

### Deploy to Vercel

1. **Connect GitHub repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

2. **Configure environment variables**
   - Add all variables from `.env.local` to Vercel
   - Go to Project Settings > Environment Variables

3. **Deploy**
   - Push to `main` branch
   - Vercel will automatically deploy

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Project Progress

Track development progress in [CLAUDE.MD](./CLAUDE.MD)

View detailed development plan in [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## Security

- All database tables use Row Level Security (RLS)
- API routes validate user authentication
- File uploads are validated for type and size
- Input sanitization prevents XSS attacks
- Rate limiting prevents abuse
- Environment variables protect sensitive keys

Report security vulnerabilities to: [security@bajetai.com] (update with actual email)

## Performance

- Static pages generated at build time
- API routes cached when possible
- Images optimized with Next.js Image component
- Database queries optimized with indexes
- AI processing runs in background

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation:** [bajetAI_overview.md](./bajetAI_overview.md)
- **Issues:** [GitHub Issues](https://github.com/yourusername/bajetAI/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/bajetAI/discussions)

## Roadmap

### Phase 1: MVP (Current)
- [x] Project setup
- [ ] Authentication
- [ ] Document upload
- [ ] AI summarization
- [ ] Translation
- [ ] Public portal
- [ ] Comment system

### Phase 2: Enhancement
- [ ] Comment analysis
- [ ] Official dashboard
- [ ] Analytics
- [ ] Export functionality

### Phase 3: Scale
- [ ] Multi-language support (French, Arabic)
- [ ] Advanced analytics
- [ ] Offline mode
- [ ] Mobile app

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend platform
- [Hugging Face](https://huggingface.co/) - AI models
- [Vercel](https://vercel.com/) - Deployment platform
- [shadcn/ui](https://ui.shadcn.com/) - UI components

## Authors

- Your Name - Initial work

## Contact

- **Website:** [https://bajetai.com](https://bajetai.com) (update when available)
- **Email:** contact@bajetai.com (update with actual email)
- **GitHub:** [@yourusername](https://github.com/yourusername)

---

Built with passion for government transparency and citizen engagement in Africa.
