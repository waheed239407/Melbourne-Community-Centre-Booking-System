INSERT INTO community_centres (centre_name, address_line, suburb, postcode)
VALUES ('Melbourne Community Centre - Central', '100 Example Street', 'Melbourne', '3000')
ON CONFLICT (centre_name) DO NOTHING;

INSERT INTO facilities (facility_name) VALUES
    ('Projector'),
    ('Kitchen'),
    ('Accessible Entry'),
    ('Wi-Fi')
ON CONFLICT (facility_name) DO NOTHING;
