-- Demo Responders

INSERT INTO responders
(name, type, phone, latitude, longitude, status)
VALUES
('Hyderabad Ambulance Unit 01', 'AMBULANCE', '108', 17.3850, 78.4867, 'AVAILABLE'),
('Hyderabad Police Unit 01', 'POLICE', '100', 17.3900, 78.4800, 'AVAILABLE'),
('Fire & Rescue Unit 01', 'FIRE', '101', 17.3750, 78.4900, 'AVAILABLE');

-- Demo Community Helpers

INSERT INTO helpers
(helper_code, name, phone, latitude, longitude, available)
VALUES
('H-001', 'Rahul', '9000000001', 17.3900, 78.4800, TRUE),
('H-002', 'Priya', '9000000002', 17.3800, 78.4900, TRUE),
('H-003', 'Arjun', '9000000003', 17.4000, 78.4750, TRUE);
