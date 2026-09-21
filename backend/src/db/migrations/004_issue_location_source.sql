-- Track how the reporter selected the issue coordinates.
ALTER TABLE issues
  ADD COLUMN location_source ENUM('current_location','map','manual')
    NOT NULL DEFAULT 'map' AFTER longitude;
