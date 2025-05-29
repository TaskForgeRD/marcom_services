-- init.sql - Database initialization script with user authentication

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS marcom;
USE marcom;

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
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

-- Update materi table to include user_id
CREATE TABLE IF NOT EXISTS materi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  brand_id INT NOT NULL,
  cluster_id INT NOT NULL,
  fitur VARCHAR(255),
  nama_materi VARCHAR(255),
  jenis VARCHAR(100),
  start_date DATE,
  end_date DATE,
  periode VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (brand_id) REFERENCES brand(id),
  FOREIGN KEY (cluster_id) REFERENCES cluster(id)
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