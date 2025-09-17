INSERT INTO specializations(name)
VALUES ('cardiology'),
('surgery'),
('neurology'),
('dermatology') ON CONFLICT (name) DO NOTHING;