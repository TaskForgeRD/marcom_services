-- init.sql - Database initialization script with user authentication

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS marcom;
USE marcom;

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create tables
CREATE TABLE IF NOT EXISTS brand (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS cluster (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- Create new Fitur table
CREATE TABLE IF NOT EXISTS fitur (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- Create new Jenis table
CREATE TABLE IF NOT EXISTS jenis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- Update materi table to reference fitur and jenis tables
CREATE TABLE IF NOT EXISTS materi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  brand_id INT NOT NULL,
  cluster_id INT NOT NULL,
  fitur_id INT,
  nama_materi VARCHAR(255),
  jenis_id INT,
  start_date DATE,
  end_date DATE,
  periode VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (brand_id) REFERENCES brand(id),
  FOREIGN KEY (cluster_id) REFERENCES cluster(id),
  FOREIGN KEY (fitur_id) REFERENCES fitur(id),
  FOREIGN KEY (jenis_id) REFERENCES jenis(id)
);

CREATE TABLE IF NOT EXISTS dokumen_materi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  materi_id INT NOT NULL,
  link_dokumen TEXT,
  tipe_materi VARCHAR(255),
  thumbnail VARCHAR(255),
  FOREIGN KEY (materi_id) REFERENCES materi(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dokumen_materi_keyword (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dokumen_materi_id INT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  FOREIGN KEY (dokumen_materi_id) REFERENCES dokumen_materi(id) ON DELETE CASCADE
);

-- Insert sample data
-- Brands
INSERT INTO brand (name) VALUES 
  ('BRImo');

-- Clusters
INSERT INTO cluster (name) VALUES 
  ('Bayar-Bayar Harian'),
  ('Bayar-Bayar Bulanan'),
  ('Tagihan');

-- Fitur data
INSERT INTO fitur (name) VALUES 
  ('Donasi'),
  ('QRIS Source CC'),
  ('Transfer Internasional');  

-- Jenis data
INSERT INTO jenis (name) VALUES 
  ('Tematik'),
  ('Tactical');

ALTER TABLE users
ADD COLUMN role ENUM('user', 'admin', 'superadmin', 'guest') NOT NULL DEFAULT 'guest';
