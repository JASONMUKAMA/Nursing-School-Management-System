import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, eventsApi } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import type { PublicStats, SchoolEvent } from '../../types';
import { PublicPaySection } from './PublicPaySection';

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-UG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function LandingPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getPublicStats().catch(() => null),
      eventsApi.getUpcoming(5).catch(() => []),
    ]).then(([statsData, eventsData]) => {
      setStats(statsData);
      setEvents(eventsData);
      setLoading(false);
    });
  }, []);

  const statCards = stats
    ? [
        { label: 'Enrolled Students', value: stats.students, icon: '👨‍⚕️' },
        { label: 'Nursing Programs', value: stats.programs, icon: '📚' },
        { label: 'Expert Lecturers', value: stats.lecturers, icon: '🎓' },
        { label: 'Clinical Partners', value: stats.clinicalPartners, icon: '🏥' },
      ]
    : [];

  const features = [
    {
      icon: '📋',
      title: 'Admissions & Enrollment',
      text: 'Streamlined application processing from intake to student registration across all nursing programs.',
    },
    {
      icon: '🩺',
      title: 'Clinical Placements',
      text: 'Track rotations at Mulago, regional hospitals, and community health centres across Uganda.',
    },
    {
      icon: '💳',
      title: 'Fee Management',
      text: 'Transparent invoicing, mobile money payments, and real-time balance tracking for students and guardians.',
    },
    {
      icon: '📊',
      title: 'Academic Excellence',
      text: 'Attendance, assessments, and NCLEX-aligned grading — all in one integrated platform.',
    },
  ];

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <span className="landing-brand-icon">➕</span>
            <span className="landing-brand-text">Excellence in Healthcare Education</span>
          </div>
          <nav className="landing-nav-links">
            <a href="#about">About</a>
            <a href="#pay">Pay Fees</a>
            <a href="#events">Events</a>
            <a href="#features">Programs</a>
            <Link to="/login">
              <Button size="sm">Staff Portal</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true" />
        <div className="landing-hero-content">
          <span className="landing-badge">🇺🇬 Uganda · NCHE Accredited</span>
          <h1>
            Shaping the next generation of
            <span className="gradient-text"> compassionate nurses</span>
          </h1>
          <p>
            A modern nursing school management platform built for Uganda — from admissions and
            clinical rotations to finance and results, empowering healthcare education across the
            Pearl of Africa.
          </p>
          <div className="landing-hero-actions">
            <a href="#pay">
              <Button className="landing-cta-primary">Pay School Fees</Button>
            </a>
            <Link to="/login">
              <Button variant="secondary" className="landing-cta-secondary">
                Staff Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-stats" id="about">
        <div className="landing-section-inner">
          {loading ? (
            <Loading />
          ) : (
            <div className="landing-stats-grid">
              {statCards.map((stat) => (
                <div key={stat.label} className="landing-stat-card">
                  <span className="landing-stat-icon">{stat.icon}</span>
                  <p className="landing-stat-value">{stat.value.toLocaleString()}</p>
                  <p className="landing-stat-label">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <PublicPaySection />

      <section className="landing-events" id="events">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <h2>Upcoming Events</h2>
            <p>Stay connected with campus life, clinical briefings, and academic milestones.</p>
          </div>
          {loading ? (
            <Loading />
          ) : events.length === 0 ? (
            <p className="text-muted landing-empty">No upcoming events scheduled.</p>
          ) : (
            <div className="landing-events-grid">
              {events.map((event) => (
                <article key={event.id} className="landing-event-card">
                  <span className="landing-event-type">{event.eventType}</span>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  <div className="landing-event-meta">
                    <span>📅 {formatEventDate(event.startDate)}</span>
                    <span>📍 {event.location}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <h2>Built for Nursing Education</h2>
            <p>Everything your institution needs to train world-class healthcare professionals.</p>
          </div>
          <div className="landing-features-grid">
            {features.map((feature) => (
              <div key={feature.title} className="landing-feature-card">
                <span className="landing-feature-icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2>Ready to access your portal?</h2>
          <p>Students, lecturers, and staff — sign in to manage your academic journey.</p>
          <Link to="/login">
            <Button className="landing-cta-primary">Go to Login</Button>
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} Nursing School Management System</p>
        <p className="text-muted">Empowering healthcare education across Uganda</p>
      </footer>
    </div>
  );
}
