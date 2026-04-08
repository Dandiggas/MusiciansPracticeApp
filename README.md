# Musicians Practice App

A full-stack web application for musicians to track, analyze, and improve their practice sessions. Built with Django REST Framework and Next.js 15.

## Features

### Practice Tracking
- **Real-time Practice Timer** - Start/stop timer with live duration tracking
- **Session Management** - Full CRUD operations for practice sessions
- **Tag System** - Organize sessions with custom colored tags
- **Multiple Instruments** - Track practice across different instruments

### Analytics & Insights
- **Dashboard Stats** - Total hours, weekly practice, current streak, favorite instrument
- **Calendar Heatmap** - 365-day practice activity visualization
- **Instrument Breakdown** - Pie chart showing time distribution across instruments
- **Practice Trends** - Line chart tracking session duration over time

### User Experience
- **User Authentication** - Secure registration and login with token-based auth
- **Dark/Light Mode** - Theme toggle with system preference detection
- **Responsive Design** - Mobile-friendly UI built with Tailwind CSS
- **Interactive Charts** - Dynamic visualizations using Chart.js

## Tech Stack

### Backend
- Django 5.1.4
- Django REST Framework 3.15.2
- PostgreSQL (production) / SQLite (development)
- dj-rest-auth + django-allauth for authentication
- OpenAI API integration for practice recommendations
- drf-spectacular for API documentation

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Chart.js + react-chartjs-2
- Axios for API calls

### DevOps
- Docker & Docker Compose
- CORS enabled for API access

## Project Structure

```
MusiciansPracticeApp/
├── django_project/          # Django settings & configuration
├── accounts/                # User authentication app
│   └── models.py           # CustomUser model
├── session/                 # Practice session app
│   ├── models.py           # Session & Tag models
│   ├── views.py            # API endpoints
│   ├── serializers.py      # DRF serializers
│   └── urls.py             # API routes
├── frontend/next-app/       # Next.js 15 frontend
│   ├── src/app/            # App router pages
│   ├── src/components/     # React components
│   └── src/providers/      # Theme provider
├── manage.py               # Django CLI
├── requirements.txt        # Python dependencies
├── docker-compose.yml      # Docker configuration
└── .env                    # Environment variables (not in repo)
```

## Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (for production) or SQLite (for development)
- Docker (optional)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Dandiggas/MusiciansPracticeApp
   cd MusiciansPracticeApp
   ```

2. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```bash
   SECRET_KEY=your-django-secret-key
   OPENAI_API_KEY=your-openai-api-key  # Optional
   ```

3. **Backend Setup**
   ```bash
   # Create virtual environment
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate

   # Install dependencies
   pip install -r requirements.txt

   # Run migrations
   python3 manage.py migrate

   # Create superuser (for admin access)
   python3 manage.py createsuperuser

   # Start Django server
   python3 manage.py runserver
   ```

4. **Frontend Setup**
   ```bash
   # In a new terminal
   cd frontend/next-app

   # Install dependencies
   npm install

   # Start development server
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api/v1/
   - Admin Panel: http://localhost:8000/admin
   - API Docs: http://localhost:8000/api/schema/swagger-ui/

### Docker Setup (Alternative)

```bash
# Start both Django and PostgreSQL
docker-compose up

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser
```

Then start the Next.js frontend separately:
```bash
cd frontend/next-app
npm install
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/v1/dj-rest-auth/login/` - User login
- `POST /api/v1/dj-rest-auth/registration/` - User registration
- `POST /api/v1/logout/` - User logout

### Practice Sessions
- `GET /api/v1/` - List all sessions
- `POST /api/v1/` - Create new session
- `GET /api/v1/<id>/` - Get session details
- `PUT /api/v1/<id>/` - Update session
- `DELETE /api/v1/<id>/` - Delete session

### Tags
- `GET /api/v1/tags/` - List all tags
- `POST /api/v1/tags/` - Create new tag
- `DELETE /api/v1/tags/<id>/` - Delete tag

### Analytics
- `GET /api/v1/stats/` - User practice statistics
- `GET /api/v1/calendar/?days=365` - Calendar heatmap data
- `GET /api/v1/by-instrument/?days=30` - Instrument breakdown

### Practice Timer
- `POST /api/v1/timer/start/` - Start practice timer
- `POST /api/v1/timer/<id>/stop/` - Stop timer and save session
- `GET /api/v1/timer/active/` - Get active timer status

### Other
- `POST /api/v1/recommendations/` - Get AI practice recommendations
- `GET /api/v1/current-user/` - Get current user info

For complete API documentation, visit the Swagger UI at http://localhost:8000/api/schema/swagger-ui/

## Database Models

### CustomUser
Extends Django's `AbstractUser` with additional fields:
- `name` - User's display name

### Session
Practice session model:
- `user` - Foreign key to CustomUser
- `instrument` - Instrument name
- `duration` - Practice duration
- `description` - Session description
- `session_date` - Date of practice
- `display_id` - User-specific session ID
- `skill_level` - Beginner/Intermediate/Advanced
- `instrument_preference` - Primary instrument
- `goals` - Practice goals
- `in_progress` - Active timer flag
- `started_at` - Timer start timestamp
- `paused_duration` - Cumulative pause time
- `tags` - Many-to-many relationship with Tag

### Tag
Custom tags for organizing sessions:
- `name` - Tag name (unique per user)
- `color` - Hex color code
- `user` - Foreign key to CustomUser

## Development

### Running Tests
```bash
# Backend tests
python3 manage.py test

# Frontend tests (if configured)
cd frontend/next-app
npm test
```

### Database Migrations
```bash
# Create new migrations
python3 manage.py makemigrations

# Apply migrations
python3 manage.py migrate

# Show migration status
python3 manage.py showmigrations
```

### Admin Panel
Create a superuser to access the Django admin:
```bash
python3 manage.py createsuperuser
```
Then visit http://localhost:8000/admin

## Roadmap

### Planned Features
- [ ] Timer pause/resume functionality
- [ ] Practice recommendations integration (frontend)
- [ ] Session filtering and search
- [ ] User profile editing
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Social authentication
- [ ] Practice goal tracking
- [ ] Achievement system
- [ ] Export practice data (CSV/PDF)

### Technical Improvements
- [ ] Add comprehensive test coverage
- [ ] Set up CI/CD pipeline
- [ ] Production environment configuration
- [ ] Performance optimization
- [ ] Error tracking (Sentry)
- [ ] Analytics integration

## Contributing

This is a personal project, but suggestions and feedback are welcome! Feel free to open an issue or submit a pull request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Contact

Created by [Dandiggas](https://github.com/Dandiggas)

---

**Note:** This is a work in progress. Some features may be incomplete or under development.
