INSERT INTO services(slug,title,category,description,price_kobo,estimated_days) VALUES
('custom-jingle','Custom Jingle','Advertising','Branded jingle for radio, social media and campaigns.',4500000,3),
('custom-song','Custom Song','Music','Original song created around a customer brief.',8500000,7),
('voice-over','Voice-over','Voice','Professional voice recording for adverts and announcements.',2500000,2),
('mixing-mastering','Mixing & Mastering','Production','Polished audio ready for release.',3500000,4),
('event-song','Event Song','Music','Bespoke music for celebrations and special occasions.',6500000,6),
('podcast-production','Podcast Production','Production','Podcast editing, cleanup and finishing.',3000000,3)
ON CONFLICT(slug) DO NOTHING;
