# 🛡️ ProximityProtect

> AI-Powered Predictive Child Safety Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime-orange.svg)](https://firebase.google.com/)

<img width="333" height="333" alt="Image" src="https://github.com/user-attachments/assets/2242f6c0-00c2-4004-9004-32f6f088daa2" />

<p>
ProximityProtect is an intelligent child safety platform that shifts from reactive tracking to proactive protection through AI-driven behavioral anomaly detection, geo-fencing, and real-time monitoring.
</p>


## 🎯 Problem Statement

Child abduction and missing child incidents are increasing in urban areas. Most existing safety solutions are reactive—they help track a child only after something has already gone wrong. ProximityProtect provides predictive protection by learning normal behavior patterns and alerting guardians before situations escalate.

## ✨ Key Features

### 🗺️ Geo-Fencing Safe Zones
- Define multiple safe zones (home, school, playground)
- Instant alerts on boundary breaches
- Visual map-based zone management

### 📍 Real-Time GPS Tracking
- Live location updates every 30-60 seconds
- Interactive map dashboard
- 30-day route history visualization
- Movement pattern analysis

### 🚨 Emergency SOS
- One-tap emergency button
- Instant notification to all guardians
- Real-time location sharing
- Emergency audio capture activation

### 🎙️ Emergency Ambient Audio Capture
- **Privacy-first**: Only triggered during emergencies
- 5-10 second ambient audio recording
- End-to-end encryption
- Optional speech-to-text conversion
- Auto-deletion after 7 days

### 🤖 AI-Based Route Anomaly Detection (USP)
Our AI engine continuously learns and detects:
- Route deviations from normal patterns
- Unexpected stops or detours
- Unusual travel duration
- Abnormal speed changes
- Movement at irregular hours

**Risk Classification:**
- 🟢 Low Risk: Minor deviations
- 🟡 Medium Risk: Significant anomalies
- 🔴 High Risk: Critical deviations requiring immediate attention

### 🔋 Device Monitoring
- Low battery alerts (< 20%)
- GPS disabled detection
- App tampering notifications
- Device power-off alerts

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Child App     │         │   Parent App    │
│  (Flutter/RN)   │         │  (Flutter/RN)   │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ HTTPS/WSS                 │ HTTPS/WSS
         │                           │
         └───────────┬───────────────┘
                     │
         ┌───────────▼────────────┐
         │   Backend Server       │
         │   (FastAPI/Python)     │
         └───┬──────────────┬─────┘
             │              │
    ┌────────▼─────┐   ┌───▼──────────┐
    │   Firebase   │   │  AI Engine   │
    │   Database   │   │  (ML Model)  │
    └──────────────┘   └───┬──────────┘
                           │
                  ┌────────▼─────────┐
                  │ Notification     │
                  │ Service (FCM)    │
                  └──────────────────┘
```

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI / Flask
- **Language**: Python 3.9+
- **Database**: Firebase Realtime Database / Firestore
- **AI/ML**: Scikit-learn, Pandas, NumPy
- **Authentication**: JWT tokens

### Frontend
- **Framework**: Flutter / React Native
- **Maps**: Google Maps SDK
- **Notifications**: Firebase Cloud Messaging (FCM)

### Infrastructure
- **Cloud**: AWS / GCP / Azure
- **Storage**: Cloud Storage (encrypted audio files)
- **Monitoring**: Prometheus + Grafana
- **Containerization**: Docker + Kubernetes

## 🚀 Getting Started

### Prerequisites
- Python 3.9 or higher
- Node.js 16+ (for mobile app development)
- Firebase account
- Google Maps API key

### Backend Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/proximityprotect.git
cd proximityprotect
```

2. Create virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your Firebase credentials and API keys
```

5. Run the backend server
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### Mobile App Setup

1. Navigate to mobile app directory
```bash
cd mobile-app
```

2. Install dependencies
```bash
flutter pub get  # For Flutter
# OR
npm install      # For React Native
```

3. Configure Firebase
- Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
- Update Firebase configuration in app

4. Run the app
```bash
flutter run      # For Flutter
# OR
npm run android  # For React Native
```

## 📚 Documentation

- [Requirements Specification](./requirements.md) - Detailed functional and non-functional requirements
- [System Design](./design.md) - Architecture, data models, and technical design
- [API Documentation](./docs/api.md) - REST API endpoints and WebSocket specifications
- [Deployment Guide](./docs/deployment.md) - Production deployment instructions

## 🔒 Security & Privacy

ProximityProtect takes security and privacy seriously:

- ✅ **End-to-end encryption** for all sensitive data
- ✅ **Event-triggered audio** recording only (not continuous)
- ✅ **Auto-deletion** of audio after 7 days
- ✅ **GDPR compliant** data handling
- ✅ **Token-based authentication** with JWT
- ✅ **Rate limiting** on all API endpoints
- ✅ **No PII in logs** or analytics

## 🧪 Testing

Run the test suite:

```bash
# Backend tests
pytest tests/ --cov=app

# Integration tests
pytest tests/integration/

# Load testing
locust -f tests/load/locustfile.py
```

## 📊 Performance Metrics

- ⚡ Alert delivery: < 5 seconds
- 📍 GPS update latency: < 3 seconds
- 🤖 AI anomaly detection: < 2 seconds
- 🎯 System uptime: 99.5%+
- 👥 Concurrent users: 10,000+

## 🗺️ Roadmap

### Phase 1 (Current)
- [x] Core geo-fencing functionality
- [x] Real-time GPS tracking
- [x] SOS emergency system
- [x] Basic anomaly detection

### Phase 2 (Q2 2026)
- [ ] Advanced AI pattern learning
- [ ] Multi-child support
- [ ] Wearable device integration
- [ ] Offline mode with sync

### Phase 3 (Q3 2026)
- [ ] School integration APIs
- [ ] Community safety network
- [ ] Predictive crime-risk heatmap
- [ ] Voice-activated SOS

### Phase 4 (Q4 2026)
- [ ] Government dashboard integration
- [ ] B2B enterprise features
- [ ] Advanced analytics dashboard
- [ ] International expansion

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 👥 Team

- **Project Lead**: [Your Name]
- **Backend Developer**: [Name]
- **Mobile Developer**: [Name]
- **AI/ML Engineer**: [Name]
- **UI/UX Designer**: [Name]

## 📧 Contact

- **Email**: support@proximityprotect.com
- **Website**: https://proximityprotect.com
- **Twitter**: [@ProximityProtect](https://twitter.com/proximityprotect)
- **Discord**: [Join our community](https://discord.gg/proximityprotect)

## 🙏 Acknowledgments

- Google Maps API for location services
- Firebase for real-time database
- Scikit-learn for ML capabilities
- The open-source community

## ⚠️ Disclaimer

ProximityProtect is designed to assist in child safety but should not be the sole method of supervision. Always maintain appropriate parental oversight and supervision. The system's effectiveness depends on device functionality, network connectivity, and proper usage.

---

<div align="center">

**Built with ❤️ for child safety**

[Report Bug](https://github.com/yourusername/proximityprotect/issues) · [Request Feature](https://github.com/yourusername/proximityprotect/issues) · [Documentation](https://docs.proximityprotect.com)

</div>
