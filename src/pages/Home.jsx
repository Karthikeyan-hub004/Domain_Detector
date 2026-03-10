import React from 'react';
import { Link } from 'react-router-dom';
import { domains } from '../data/domains';

const domainEmojis = {
    'web-development': '🌐',
    'software-development': '💻',
    'mobile-app-development': '📱',
    'ai-machine-learning': '🤖',
    'data-science': '📊',
    'cybersecurity': '🔐',
    'web-designing': '🎨',
    'typewriting': '⌨️',
    'ats-friendly-resume': '📄',
};

const Home = () => {
    return (
        <div className="container">
            <header className="hero">
                <div className="hero-badge">✨ Career Path Discovery Platform</div>
                <h1>
                    Discover Your Passion <br />
                    <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Build Your Future
                    </span>
                </h1>
                <p>
                    Stop following trends blindly. Take our AI-powered quiz, explore domains,
                    and find the career path that truly fits you.
                </p>
                <div className="hero-actions">
                    <Link to="/career-quiz" className="btn btn-primary">🎯 Take Career Quiz</Link>
                    <a href="#domains" className="btn btn-ghost">Explore Domains</a>
                </div>
                <div className="stats-strip">
                    <div className="stat-item">
                        <span className="stat-number">{domains.length}+</span>
                        <span className="stat-label">Tech Domains</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">15</span>
                        <span className="stat-label">Quiz Questions</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">AI</span>
                        <span className="stat-label">Powered Chat</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">Free</span>
                        <span className="stat-label">Always</span>
                    </div>
                </div>
            </header>

            <section id="domains" style={{ marginTop: '3rem' }}>
                <div className="section-header">
                    <h2>Explore <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tech Domains</span></h2>
                    <p>Click any domain to see the full roadmap, tools, certifications, and project ideas.</p>
                </div>
                <div className="grid">
                    {domains.map((domain) => (
                        <Link to={`/domain/${domain.id}`} key={domain.id} className="card">
                            <span className="card-emoji">{domainEmojis[domain.id] || '🚀'}</span>
                            <h3>{domain.title}</h3>
                            <p>{domain.description}</p>
                            <div className="tag-container">
                                {domain.jobs.slice(0, 2).map((job, index) => (
                                    <span key={index} className="tag">{job}</span>
                                ))}
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Home;
