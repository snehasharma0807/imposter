-- Seed data for default_categories
-- These rows are publicly readable (no RLS on default_categories).
-- Run this file against your Supabase project to populate the default word lists.

TRUNCATE TABLE default_categories;

INSERT INTO default_categories (name, words) VALUES
(
  'Animals',
  ARRAY[
    'Lion', 'Elephant', 'Giraffe', 'Penguin', 'Dolphin',
    'Tiger', 'Eagle', 'Cheetah', 'Gorilla', 'Kangaroo',
    'Crocodile', 'Flamingo', 'Panda', 'Shark', 'Octopus',
    'Chimpanzee', 'Polar Bear', 'Peacock', 'Komodo Dragon', 'Manta Ray',
    'Wolverine', 'Narwhal', 'Axolotl', 'Capybara'
  ]
),
(
  'Food',
  ARRAY[
    'Pizza', 'Sushi', 'Tacos', 'Ramen', 'Croissant',
    'Paella', 'Falafel', 'Dumplings', 'Lasagna', 'Burrito',
    'Pad Thai', 'Biryani', 'Fondue', 'Pho', 'Churros',
    'Moussaka', 'Baklava', 'Tiramisu', 'Ceviche', 'Gyoza',
    'Schnitzel', 'Kimchi', 'Pierogi', 'Shakshuka'
  ]
),
(
  'Movies',
  ARRAY[
    'Inception', 'Titanic', 'Avatar', 'Jaws', 'Psycho',
    'Casablanca', 'Gladiator', 'Interstellar', 'The Matrix', 'Parasite',
    'Alien', 'Braveheart', 'Goodfellas', 'Pulp Fiction', 'Shrek',
    'Clueless', 'Beetlejuice', 'Grease', 'Rocky', 'Jumanji',
    'Forrest Gump', 'Spirited Away', 'The Godfather', 'Toy Story'
  ]
),
(
  'Sports',
  ARRAY[
    'Soccer', 'Basketball', 'Tennis', 'Swimming', 'Boxing',
    'Volleyball', 'Baseball', 'Cycling', 'Gymnastics', 'Surfing',
    'Skiing', 'Archery', 'Fencing', 'Rowing', 'Skateboarding',
    'Rugby', 'Cricket', 'Badminton', 'Judo', 'Wrestling',
    'Polo', 'Curling', 'Bobsled', 'Triathlon'
  ]
),
(
  'Places',
  ARRAY[
    'Paris', 'Tokyo', 'New York', 'Sydney', 'Cairo',
    'Rome', 'Machu Picchu', 'Santorini', 'Bali', 'Marrakech',
    'Istanbul', 'Kyoto', 'Barcelona', 'Dubai', 'Rio de Janeiro',
    'Prague', 'Cape Town', 'Bangkok', 'Vienna', 'Amsterdam',
    'Havana', 'Reykjavik', 'Zanzibar', 'Queenstown'
  ]
),
(
  'Jobs',
  ARRAY[
    'Astronaut', 'Chef', 'Architect', 'Surgeon', 'Firefighter',
    'Pilot', 'Detective', 'Journalist', 'Veterinarian', 'Marine Biologist',
    'Electrician', 'Pharmacist', 'Stunt Double', 'Sommelier', 'Cartographer',
    'Cryptographer', 'Puppeteer', 'Locksmith', 'Beekeeper', 'Geologist',
    'Air Traffic Controller', 'Forensic Scientist', 'Oyster Farmer', 'Volcanologist'
  ]
),
(
  'Objects',
  ARRAY[
    'Telescope', 'Compass', 'Umbrella', 'Lantern', 'Typewriter',
    'Suitcase', 'Magnifying Glass', 'Hourglass', 'Accordion', 'Periscope',
    'Abacus', 'Boomerang', 'Kaleidoscope', 'Harmonica', 'Sundial',
    'Metronome', 'Sextant', 'Didgeridoo', 'Theremin', 'Stereoscope',
    'Pendulum', 'Loom', 'Astrolabe', 'Phonograph'
  ]
);
