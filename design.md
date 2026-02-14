# ProximityProtect - System Design Document

## 1. System Overview

ProximityProtect is a predictive child safety intelligence platform that uses geo-fencing and AI-driven behavioral anomaly detection to prevent potential abduction scenarios through early intervention alerts.

### 1.1 Design Principles
- **Proactive over Reactive**: Predict and prevent rather than respond
- **Privacy-First**: Minimal data collection, event-triggered recording only
- **Real-Time Processing**: Sub-5-second alert delivery
- **Scalable Architecture**: Support growing user base
- **Fail-Safe Design**: Graceful degradation during failures

## 2. System Architecture

### 2.1 High-Level Architecture

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
         │   API Gateway          │
         │   (Load Balancer)      │
         └───────────┬────────────┘
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

### 2.2 Component Architecture

#### 2.2.1 Child Mobile App
**Responsibilities:**
- Collect GPS data periodically
- Monitor device state (battery, GPS status)
- Provide SOS button interface
- Capture emergency audio when triggered
- Send encrypted data to backend

**Key Modules:**
- Location Service (background GPS tracking)
- SOS Handler
- Audio Capture Module
- Network Communication Layer
- Local Data Cache (offline support)

#### 2.2.2 Parent Mobile App
**Responsibilities:**
- Display real-time child location
- Show alerts and notifications
- Manage geo-fences
- View route history
- Play emergency audio recordings
- Configure settings

**Key Modules:**
- Map Visualization
- Alert Dashboard
- Geo-fence Manager
- Notification Handler
- Audio Player

#### 2.2.3 Backend Server (FastAPI)
**Responsibilities:**
- Receive and validate GPS data
- Store location history
- Trigger AI anomaly detection
- Manage geo-fence logic
- Handle SOS events
- Send push notifications
- User authentication and authorization

**Key Modules:**
- API Endpoints
- Authentication Service
- Location Processing Service
- Geo-fence Service
- SOS Handler
- Audio Processing Service
- Notification Dispatcher

#### 2.2.4 AI Anomaly Detection Engine
**Responsibilities:**
- Learn normal movement patterns
- Detect route deviations
- Classify risk levels
- Continuously adapt to new patterns

**Key Modules:**
- Pattern Learning Module
- Anomaly Detection Model
- Risk Classifier
- Model Training Pipeline

#### 2.2.5 Firebase Database
**Responsibilities:**
- Store user profiles
- Store location history
- Store geo-fence definitions
- Store notification logs
- Real-time data synchronization

**Collections:**
- users
- children
- locations
- geofences
- alerts
- audio_recordings

#### 2.2.6 Notification Service
**Responsibilities:**
- Send push notifications
- Handle notification delivery status
- Manage notification preferences

## 3. Data Design

### 3.1 Database Schema

#### Users Collection
```json
{
  "user_id": "string (UUID)",
  "email": "string",
  "password_hash": "string",
  "name": "string",
  "phone": "string",
  "role": "parent | guardian",
  "created_at": "timestamp",
  "fcm_token": "string"
}
```

#### Children Collection
```json
{
  "child_id": "string (UUID)",
  "name": "string",
  "age": "number",
  "parent_ids": ["user_id1", "user_id2"],
  "device_id": "string",
  "profile_image": "string (URL)",
  "created_at": "timestamp"
}
```

#### Locations Collection
```json
{
  "location_id": "string (UUID)",
  "child_id": "string",
  "latitude": "number",
  "longitude": "number",
  "accuracy": "number",
  "speed": "number",
  "timestamp": "timestamp",
  "battery_level": "number",
  "is_anomaly": "boolean",
  "risk_level": "low | medium | high | null"
}
```

#### Geofences Collection
```json
{
  "geofence_id": "string (UUID)",
  "child_id": "string",
  "name": "string (home, school, etc.)",
  "center_lat": "number",
  "center_lng": "number",
  "radius": "number (meters)",
  "shape": "circle | polygon",
  "coordinates": "array (for polygon)",
  "is_active": "boolean",
  "created_at": "timestamp"
}
```

#### Alerts Collection
```json
{
  "alert_id": "string (UUID)",
  "child_id": "string",
  "type": "geofence_breach | route_anomaly | sos | device_tampering | low_battery",
  "risk_level": "low | medium | high",
  "message": "string",
  "location": {
    "latitude": "number",
    "longitude": "number"
  },
  "timestamp": "timestamp",
  "is_read": "boolean",
  "audio_url": "string (optional)"
}
```

#### Audio Recordings Collection
```json
{
  "audio_id": "string (UUID)",
  "alert_id": "string",
  "child_id": "string",
  "encrypted_url": "string",
  "duration": "number (seconds)",
  "transcript": "string (optional)",
  "created_at": "timestamp",
  "expires_at": "timestamp (auto-delete after 7 days)"
}
```

### 3.2 Data Flow Diagrams

#### 3.2.1 Normal Tracking Flow
```
Child Device → GPS Data Collection (every 30-60s)
    ↓
Send to Backend (HTTPS)
    ↓
Store in Firebase Database
    ↓
Trigger AI Anomaly Detection
    ↓
Calculate Risk Score
    ↓
Is Anomaly Detected?
    ├─ NO → Continue Monitoring
    └─ YES → Classify Risk Level
              ↓
         Send Alert to Parent
              ↓
         Log in Alerts Collection
```

#### 3.2.2 SOS Emergency Flow
```
Child Presses SOS Button
    ↓
Capture Current Location
    ↓
Start Audio Recording (5-10s)
    ↓
Encrypt Audio Data
    ↓
Send to Backend (Priority)
    ↓
Backend Processes:
    ├─ Store Location
    ├─ Store Encrypted Audio
    ├─ Create High-Priority Alert
    └─ Send Push Notifications to All Guardians
         ↓
Parent Receives Alert
    ↓
View Location + Play Audio
```

#### 3.2.3 Geo-fence Breach Flow
```
GPS Update Received
    ↓
Check Against Active Geo-fences
    ↓
Is Child Outside Boundary?
    ├─ NO → Continue Monitoring
    └─ YES → Create Geo-fence Breach Alert
              ↓
         Send Notification to Parents
              ↓
         Log Event
```

## 4. AI/ML Design

### 4.1 Anomaly Detection Approach

#### 4.1.1 Feature Engineering
Extract features from location data:
- Distance from usual route
- Time deviation from normal schedule
- Speed variation
- Stop duration
- Day of week / time of day patterns
- Frequency of visits to location

#### 4.1.2 Model Architecture

**Phase 1: Pattern Learning**
- Collect minimum 7-14 days of baseline data
- Build statistical profile of normal behavior
- Use clustering (K-Means) to identify common routes
- Calculate mean and standard deviation for timing patterns

**Phase 2: Anomaly Detection**
- Use Isolation Forest algorithm for outlier detection
- Statistical threshold-based detection (Z-score)
- Distance-based anomaly scoring

**Phase 3: Risk Classification**
```python
Risk Score Calculation:
- Route Deviation Score (0-100)
- Time Deviation Score (0-100)
- Speed Anomaly Score (0-100)
- Location Unfamiliarity Score (0-100)

Weighted Risk Score = 
  (0.4 × Route) + (0.3 × Time) + (0.2 × Speed) + (0.1 × Location)

Classification:
- Low Risk: Score < 40
- Medium Risk: 40 ≤ Score < 70
- High Risk: Score ≥ 70
```

#### 4.1.3 Model Training Pipeline
```
Historical Data → Feature Extraction → Model Training → Validation
                                            ↓
                                    Deploy to Production
                                            ↓
                                    Continuous Learning
                                            ↓
                                    Periodic Retraining
```

### 4.2 AI Module Implementation

```python
# Pseudocode for Anomaly Detection
class AnomalyDetector:
    def __init__(self, child_id):
        self.child_id = child_id
        self.model = IsolationForest()
        self.baseline_data = load_baseline(child_id)
        
    def detect_anomaly(self, current_location):
        features = extract_features(current_location, self.baseline_data)
        anomaly_score = self.model.predict(features)
        risk_level = classify_risk(anomaly_score)
        return {
            'is_anomaly': anomaly_score < 0,
            'risk_level': risk_level,
            'confidence': abs(anomaly_score)
        }
    
    def update_baseline(self, new_data):
        # Continuous learning
        self.baseline_data.append(new_data)
        if len(self.baseline_data) > threshold:
            self.retrain_model()
```

## 5. Security Design

### 5.1 Authentication & Authorization
- JWT-based token authentication
- Token expiration: 24 hours
- Refresh token mechanism
- Role-based access control (RBAC)

### 5.2 Data Encryption
- **In Transit**: TLS 1.3 for all API communication
- **At Rest**: AES-256 encryption for audio files
- **Database**: Firebase built-in encryption

### 5.3 API Security
- Rate limiting: 100 requests/minute per user
- Input validation and sanitization
- CORS policy enforcement
- API key rotation

### 5.4 Privacy Protection
- Audio recording only on explicit trigger
- Auto-deletion of sensitive data
- Anonymized analytics
- GDPR compliance mechanisms

## 6. API Design

### 6.1 Core Endpoints

#### Authentication
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

#### Location Tracking
```
POST /api/v1/locations
GET /api/v1/locations/{child_id}
GET /api/v1/locations/{child_id}/history
```

#### Geo-fencing
```
POST /api/v1/geofences
GET /api/v1/geofences/{child_id}
PUT /api/v1/geofences/{geofence_id}
DELETE /api/v1/geofences/{geofence_id}
```

#### Emergency
```
POST /api/v1/emergency/sos
POST /api/v1/emergency/audio
GET /api/v1/emergency/audio/{audio_id}
```

#### Alerts
```
GET /api/v1/alerts/{parent_id}
PUT /api/v1/alerts/{alert_id}/read
DELETE /api/v1/alerts/{alert_id}
```

### 6.2 WebSocket Endpoints
```
WS /api/v1/ws/location/{child_id}  # Real-time location updates
WS /api/v1/ws/alerts/{parent_id}   # Real-time alert notifications
```

## 7. Deployment Architecture

### 7.1 Infrastructure
- **Cloud Provider**: AWS / GCP / Azure
- **Compute**: Container-based (Docker + Kubernetes)
- **Database**: Firebase (managed service)
- **Storage**: Cloud Storage for audio files
- **CDN**: CloudFlare for static assets
- **Monitoring**: Prometheus + Grafana

### 7.2 Scalability Strategy
- Horizontal scaling of backend services
- Load balancing across multiple instances
- Database sharding by user region
- Caching layer (Redis) for frequent queries
- Asynchronous processing for AI tasks (Celery)

### 7.3 High Availability
- Multi-region deployment
- Automatic failover
- Database replication
- Health checks and auto-recovery

## 8. Performance Optimization

### 8.1 Backend Optimization
- Connection pooling
- Query optimization
- Caching strategy (Redis)
- Asynchronous task processing
- Database indexing

### 8.2 Mobile App Optimization
- Efficient GPS sampling (adaptive frequency)
- Battery optimization techniques
- Local caching
- Compression for data transmission
- Background service optimization

### 8.3 AI Model Optimization
- Model quantization for faster inference
- Batch processing for multiple children
- Incremental learning to reduce retraining time

## 9. Monitoring & Logging

### 9.1 Metrics to Track
- API response times
- Alert delivery latency
- GPS update frequency
- Model prediction accuracy
- System uptime
- Error rates
- User engagement

### 9.2 Logging Strategy
- Structured logging (JSON format)
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Centralized log aggregation
- Log retention: 90 days

### 9.3 Alerting
- System downtime alerts
- High error rate alerts
- Database performance alerts
- Security incident alerts

## 10. Testing Strategy

### 10.1 Unit Testing
- Backend API endpoints
- AI model functions
- Utility functions

### 10.2 Integration Testing
- API integration tests
- Database integration tests
- Third-party service integration

### 10.3 End-to-End Testing
- Complete user flows
- SOS emergency scenarios
- Geo-fence breach scenarios

### 10.4 Performance Testing
- Load testing (1000+ concurrent users)
- Stress testing
- Latency testing

### 10.5 Security Testing
- Penetration testing
- Vulnerability scanning
- Authentication testing

## 11. Deployment Strategy

### 11.1 CI/CD Pipeline
```
Code Commit → Automated Tests → Build Docker Image → 
Push to Registry → Deploy to Staging → Manual Approval → 
Deploy to Production → Health Check → Rollback if Failed
```

### 11.2 Release Strategy
- Blue-green deployment
- Canary releases for major updates
- Feature flags for gradual rollout

## 12. Disaster Recovery

### 12.1 Backup Strategy
- Daily automated database backups
- Backup retention: 30 days
- Cross-region backup replication

### 12.2 Recovery Plan
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 15 minutes
- Documented recovery procedures
- Regular disaster recovery drills

## 13. Future Architecture Considerations

- Microservices architecture for better scalability
- GraphQL API for flexible data queries
- Edge computing for faster local processing
- Blockchain for immutable audit trail
- Integration with IoT wearables
- Multi-tenant architecture for B2B offerings
