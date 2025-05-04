-- init.sql - Database initialization script

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS marcom;
USE marcom;

-- Create tables
CREATE TABLE IF NOT EXISTS brand (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS cluster (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS materi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  cluster_id INT NOT NULL,
  fitur VARCHAR(255),
  nama_materi VARCHAR(255),
  jenis VARCHAR(100),
  start_date DATE,
  end_date DATE,
  periode VARCHAR(100),
  FOREIGN KEY (brand_id) REFERENCES brand(id),
  FOREIGN KEY (cluster_id) REFERENCES cluster(id)
);

CREATE TABLE IF NOT EXISTS dokumen_materi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  materi_id INT NOT NULL,
  link_dokumen TEXT,
  tipe_materi VARCHAR(255),
  thumbnail VARCHAR(255),
  FOREIGN KEY (materi_id) REFERENCES materi(id)
);

CREATE TABLE IF NOT EXISTS dokumen_materi_keyword (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dokumen_materi_id INT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  FOREIGN KEY (dokumen_materi_id) REFERENCES dokumen_materi(id)
);

-- Insert sample data
-- Brands
INSERT INTO brand (name) VALUES 
  ('BRImo'),
  ('BRI'),
  ('BRISpot');

-- Clusters
INSERT INTO cluster (name) VALUES 
  ('Bayar-Bayar Harian'),
  ('Transaksi Finansial'),
  ('Fitur Digital');