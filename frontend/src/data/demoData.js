// =====================================================
// Demo Data — Emergency Response Coordinator
// Keep demo data separate from UI components
// =====================================================

export const DEMO_EMERGENCIES = [
  {
    id: 'ER-1042',
    type: 'Road Accident',
    typeIcon: 'bi-car-front-fill',
    description: 'Two vehicles collided at an intersection. One person appears to need medical assistance. Debris on road.',
    priority: 'critical',
    status: 'dispatched',
    location: {
      address: 'Main Road & Oak Street Intersection',
      area: 'Downtown District',
      lat: 28.6139,
      lng: 77.2090,
      distance: '0.8 km',
    },
    reportedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
    reportedBy: 'John Citizen',
    ai: {
      classification: 'Road Accident',
      severity: 'Critical',
      confidence: 94,
      recommendedResponders: ['Ambulance', 'Police'],
      coordinatorRequired: true,
    },
    responders: [
      { type: 'Ambulance', status: 'en-route', eta: '4 min' },
      { type: 'Police',    status: 'dispatched', eta: '6 min' },
    ],
    helpers: {
      found: 3,
      notified: 2,
      accepted: 1,
    },
    timeline: [
      { label: 'Emergency Reported', time: '15:32', done: true },
      { label: 'AI Analysis',         time: '15:32', done: true },
      { label: 'Coordinator Review',   time: '15:33', done: true },
      { label: 'Responders Dispatched',time: '15:33', done: true },
      { label: 'Response In Progress', time: null,   done: false, active: true },
      { label: 'Resolved',             time: null,   done: false },
    ],
  },
  {
    id: 'ER-1041',
    type: 'Medical Emergency',
    typeIcon: 'bi-heart-pulse-fill',
    description: 'Elderly person collapsed on the footpath. Bystanders present but no medical help available.',
    priority: 'high',
    status: 'en-route',
    location: {
      address: 'Elm Street, near City Park',
      area: 'North District',
      lat: 28.6200,
      lng: 77.2150,
      distance: '1.4 km',
    },
    reportedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    reportedBy: 'Sarah Helper',
    ai: {
      classification: 'Medical Emergency',
      severity: 'High',
      confidence: 91,
      recommendedResponders: ['Ambulance'],
      coordinatorRequired: true,
    },
    responders: [
      { type: 'Ambulance', status: 'en-route', eta: '2 min' },
    ],
    helpers: { found: 5, notified: 3, accepted: 2 },
    timeline: [
      { label: 'Emergency Reported',  time: '15:25', done: true },
      { label: 'AI Analysis',          time: '15:25', done: true },
      { label: 'Coordinator Review',   time: '15:26', done: true },
      { label: 'Responders Dispatched',time: '15:26', done: true },
      { label: 'Response In Progress', time: '15:28', done: true, active: false },
      { label: 'Resolved',             time: null,    done: false },
    ],
  },
  {
    id: 'ER-1040',
    type: 'Fire',
    typeIcon: 'bi-fire',
    description: 'Small fire reported in a kitchen of a residential apartment. Smoke visible from outside.',
    priority: 'high',
    status: 'arrived',
    location: {
      address: '45 Maple Avenue, Block B',
      area: 'West Zone',
      lat: 28.6100,
      lng: 77.2020,
      distance: '2.1 km',
    },
    reportedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    reportedBy: 'Raj Sharma',
    ai: {
      classification: 'Fire',
      severity: 'High',
      confidence: 88,
      recommendedResponders: ['Fire/Rescue', 'Ambulance'],
      coordinatorRequired: false,
    },
    responders: [
      { type: 'Fire/Rescue', status: 'arrived', eta: null },
      { type: 'Ambulance',   status: 'arrived', eta: null },
    ],
    helpers: { found: 2, notified: 2, accepted: 0 },
    timeline: [
      { label: 'Emergency Reported',  time: '15:15', done: true },
      { label: 'AI Analysis',          time: '15:15', done: true },
      { label: 'Coordinator Review',   time: '15:16', done: true },
      { label: 'Responders Dispatched',time: '15:16', done: true },
      { label: 'Response In Progress', time: '15:22', done: true },
      { label: 'Resolved',             time: null,    done: false, active: true },
    ],
  },
  {
    id: 'ER-1039',
    type: 'Crime / Safety',
    typeIcon: 'bi-shield-exclamation',
    description: 'Suspicious persons reported breaking into a vehicle in the parking lot.',
    priority: 'medium',
    status: 'dispatched',
    location: {
      address: 'Central Shopping Mall Parking',
      area: 'Central Zone',
      lat: 28.6080,
      lng: 77.2200,
      distance: '3.5 km',
    },
    reportedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    reportedBy: 'Anita Roy',
    ai: {
      classification: 'Crime / Safety',
      severity: 'Medium',
      confidence: 82,
      recommendedResponders: ['Police'],
      coordinatorRequired: false,
    },
    responders: [
      { type: 'Police', status: 'dispatched', eta: '8 min' },
    ],
    helpers: { found: 1, notified: 1, accepted: 0 },
    timeline: [
      { label: 'Emergency Reported',   time: '15:28', done: true },
      { label: 'AI Analysis',           time: '15:28', done: true },
      { label: 'Coordinator Review',    time: '15:29', done: true },
      { label: 'Responders Dispatched', time: '15:30', done: true, active: true },
      { label: 'Response In Progress',  time: null,    done: false },
      { label: 'Resolved',              time: null,    done: false },
    ],
  },
];

export const DEMO_USER = {
  id: 'USR-001',
  name: 'Alex Johnson',
  role: 'citizen',
  phone: '+91 98765 43210',
  location: { lat: 28.6139, lng: 77.2090 },
};

export const DEMO_COORDINATOR = {
  id: 'COORD-01',
  name: 'Priya Mehta',
  role: 'coordinator',
  designation: 'Emergency Response Coordinator',
  shift: 'Day Shift',
};

export const DEMO_RESPONDER = {
  id: 'RESP-001',
  name: 'Ambulance Unit A-7',
  type: 'Ambulance',
  role: 'responder',
  crew: 'Paramedic Team Alpha',
  status: 'en-route',
};

export const DEMO_HELPER = {
  id: 'HLP-001',
  name: 'Ravi Kumar',
  role: 'helper',
  skills: ['First Aid', 'CPR Certified'],
  location: { lat: 28.6145, lng: 77.2095 },
  available: true,
};

// Map demo markers
export const DEMO_MAP_MARKERS = {
  emergency: { lat: 28.6139, lng: 77.2090, type: 'emergency', label: '#ER-1042' },
  ambulance: { lat: 28.6155, lng: 77.2110, type: 'ambulance', label: 'Ambulance A-7' },
  police:    { lat: 28.6120, lng: 77.2075, type: 'police',    label: 'Police Unit P-3' },
  helper:    { lat: 28.6145, lng: 77.2095, type: 'helper',    label: 'Community Helper' },
};

// Emergency type options for the report form
export const EMERGENCY_TYPES = [
  { value: 'medical',          label: 'Medical',                icon: 'bi-heart-pulse-fill',   color: '#dc2626' },
  { value: 'road_accident',    label: 'Road Accident',          icon: 'bi-car-front-fill',      color: '#ea580c' },
  { value: 'fire',             label: 'Fire',                   icon: 'bi-fire',                color: '#d97706' },
  { value: 'crime',            label: 'Crime / Safety',         icon: 'bi-shield-exclamation',  color: '#1d4ed8' },
  { value: 'natural_disaster', label: 'Natural Disaster / Flood',icon: 'bi-cloud-rain-heavy-fill',color: '#0369a1' },
  { value: 'other',            label: 'Other',                  icon: 'bi-question-circle-fill', color: '#64748b' },
];

export const PRIORITY_COLORS = {
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#d97706',
  low:      '#16a34a',
};

export const STATUS_LABELS = {
  analyzing:  'Analyzing',
  dispatched: 'Dispatched',
  'en-route': 'En Route',
  arrived:    'Arrived',
  resolved:   'Resolved',
  pending:    'Pending',
};
