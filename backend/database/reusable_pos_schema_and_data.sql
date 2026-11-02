-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: reusable_pos
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `reusable_pos`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `reusable_pos` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `reusable_pos`;

--
-- Table structure for table `app_settings`
--

DROP TABLE IF EXISTS `app_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `group` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` longtext COLLATE utf8mb4_unicode_ci,
  `type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `app_settings_key_unique` (`key`),
  KEY `app_settings_group_index` (`group`),
  KEY `app_settings_key_index` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_settings`
--

LOCK TABLES `app_settings` WRITE;
/*!40000 ALTER TABLE `app_settings` DISABLE KEYS */;
INSERT INTO `app_settings` VALUES (1,'general','store_name','Green Mart Supermarket','string','Display name of store','2026-10-30 23:56:07','2026-10-30 23:56:07'),(2,'general','timezone','Asia/Kolkata','string','Store primary timezone','2026-10-30 23:56:07','2026-10-30 23:56:07'),(3,'general','date_format','DD/MM/YYYY','string','Display date format','2026-10-30 23:56:07','2026-10-30 23:56:07'),(4,'general','allow_negative_stock','0','boolean','Allow selling when stock is zero','2026-10-30 23:56:07','2026-10-30 23:56:07'),(5,'currency','currency_symbol','₹','string','Primary currency symbol','2026-10-30 23:56:07','2026-10-30 23:56:07'),(6,'currency','currency_code','INR','string','Primary ISO currency code','2026-10-30 23:56:07','2026-10-30 23:56:07'),(7,'currency','decimal_places','2','integer','Number of decimal positions','2026-10-30 23:56:07','2026-10-30 23:56:07'),(8,'invoice','invoice_prefix','INV','string','Sales invoice prefix','2026-10-30 23:56:07','2026-10-30 23:56:07'),(9,'invoice','header_note','Thank you for shopping with Green Mart!','string','Printed at top of invoice','2026-10-30 23:56:07','2026-10-30 23:56:07'),(10,'invoice','footer_note','Goods once sold cannot be returned without original receipt. Terms apply.','string','Printed at bottom of invoice','2026-10-30 23:56:07','2026-10-30 23:56:07'),(11,'invoice','show_qr_code','1','boolean','Print UPI/GST QR code on receipt','2026-10-30 23:56:07','2026-10-30 23:56:07'),(12,'invoice','print_thermal_copies','1','integer','Default receipt print copies','2026-10-30 23:56:07','2026-10-30 23:56:07'),(13,'printer','printer_type','thermal_80mm','string','Printer type (thermal_80mm, thermal_58mm, laser_a4)','2026-10-30 23:56:07','2026-10-30 23:56:07'),(14,'printer','auto_cut_paper','1','boolean','Send cut command after print','2026-10-30 23:56:07','2026-10-30 23:56:07'),(15,'printer','open_drawer_on_sale','1','boolean','Pulse cash drawer open on cash checkout','2026-10-30 23:56:07','2026-10-30 23:56:07'),(16,'barcode','symbology','CODE128','string','Default barcode generation symbology','2026-10-30 23:56:07','2026-10-30 23:56:07'),(17,'barcode','barcode_prefix','GM','string','Prefix for auto-generated barcodes','2026-10-30 23:56:08','2026-10-30 23:56:08'),(18,'barcode','show_price_on_label','1','boolean','Display MRP/Price on printed label','2026-10-30 23:56:08','2026-10-30 23:56:08'),(19,'notification','low_stock_threshold_alert','5','integer','Alert when stock falls below','2026-10-30 23:56:08','2026-10-30 23:56:08'),(20,'notification','email_daily_summary','1','boolean','Send end-of-day sales digest','2026-10-30 23:56:08','2026-10-30 23:56:08'),(21,'sync','auto_sync_interval_mins','5','integer','Periodic auto-sync frequency in minutes','2026-10-30 23:56:08','2026-10-30 23:56:08'),(22,'sync','conflict_resolution','server_wins','string','Strategy when offline conflict occurs','2026-10-30 23:56:08','2026-10-30 23:56:08');
/*!40000 ALTER TABLE `app_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `branch_id` bigint unsigned DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `auditable_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auditable_id` bigint unsigned DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id_foreign` (`user_id`),
  KEY `audit_logs_branch_id_foreign` (`branch_id`),
  KEY `audit_logs_auditable_type_auditable_id_index` (`auditable_type`,`auditable_id`),
  KEY `audit_logs_created_at_index` (`created_at`),
  CONSTRAINT `audit_logs_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,1,'USER_LOGIN','App\\Models\\User',1,NULL,NULL,'127.0.0.1','2026-10-31 00:17:41'),(2,1,1,'USER_LOGIN','App\\Models\\User',1,NULL,NULL,'127.0.0.1','2026-10-31 00:18:00'),(3,1,1,'USER_LOGIN','App\\Models\\User',1,NULL,NULL,'127.0.0.1','2026-10-31 00:18:18'),(4,1,1,'USER_LOGIN','App\\Models\\User',1,NULL,NULL,'127.0.0.1','2026-10-31 00:18:31'),(5,1,1,'USER_LOGIN','App\\Models\\User',1,NULL,NULL,'127.0.0.1','2026-10-31 00:19:02'),(6,1,1,'USER_LOGIN','App\\Models\\User',1,NULL,NULL,'127.0.0.1','2026-10-31 01:22:19'),(7,1,1,'USER_LOGIN','App\\Models\\User',1,NULL,NULL,'127.0.0.1','2026-10-31 01:26:45'),(8,1,1,'USER_LOGIN','App\\Models\\User',1,NULL,NULL,'127.0.0.1','2026-10-31 01:36:39');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_product_prices`
--

DROP TABLE IF EXISTS `branch_product_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_product_prices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `variant_key` bigint unsigned GENERATED ALWAYS AS (coalesce(`variant_id`,0)) STORED,
  `selling_price` decimal(12,2) NOT NULL,
  `special_price` decimal(12,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_product_variant_price` (`branch_id`,`product_id`,`variant_key`),
  KEY `branch_product_prices_product_id_foreign` (`product_id`),
  KEY `branch_product_prices_variant_id_foreign` (`variant_id`),
  KEY `branch_product_prices_branch_id_is_active_index` (`branch_id`,`is_active`),
  CONSTRAINT `branch_product_prices_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `branch_product_prices_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `branch_product_prices_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_product_prices`
--

LOCK TABLES `branch_product_prices` WRITE;
/*!40000 ALTER TABLE `branch_product_prices` DISABLE KEYS */;
INSERT INTO `branch_product_prices` (`id`, `branch_id`, `product_id`, `variant_id`, `selling_price`, `special_price`, `is_active`, `created_at`, `updated_at`) VALUES (1,4,1,NULL,75.00,NULL,1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(2,4,5,NULL,380.00,NULL,1,'2026-10-30 23:03:58','2026-10-30 23:03:58');
/*!40000 ALTER TABLE `branch_product_prices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_stocks`
--

DROP TABLE IF EXISTS `branch_stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_stocks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `quantity` decimal(12,3) NOT NULL DEFAULT '0.000',
  `damaged_quantity` decimal(12,3) NOT NULL DEFAULT '0.000',
  `reserved_quantity` decimal(12,3) NOT NULL DEFAULT '0.000',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_prod_var_unique` (`branch_id`,`product_id`,`variant_id`),
  KEY `branch_stocks_product_id_foreign` (`product_id`),
  KEY `branch_stocks_variant_id_foreign` (`variant_id`),
  KEY `branch_stocks_branch_id_product_id_index` (`branch_id`,`product_id`),
  CONSTRAINT `branch_stocks_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `branch_stocks_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `branch_stocks_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_stocks`
--

LOCK TABLES `branch_stocks` WRITE;
/*!40000 ALTER TABLE `branch_stocks` DISABLE KEYS */;
INSERT INTO `branch_stocks` VALUES (1,1,1,NULL,45.000,2.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(2,1,2,NULL,3.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(3,1,3,NULL,0.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(4,1,4,NULL,120.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(5,1,5,NULL,25.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(6,1,6,NULL,45.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(7,2,1,NULL,45.000,2.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(8,2,2,NULL,3.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(9,2,3,NULL,0.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(10,2,4,NULL,120.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(11,2,5,NULL,25.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(12,2,6,NULL,45.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(13,3,1,NULL,45.000,2.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(14,3,2,NULL,3.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(15,3,3,NULL,0.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(16,3,4,NULL,120.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(17,3,5,NULL,25.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(18,3,6,NULL,45.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(19,4,1,NULL,45.000,2.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(20,4,2,NULL,3.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(21,4,3,NULL,0.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(22,4,4,NULL,120.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(23,4,5,NULL,25.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(24,4,6,NULL,45.000,0.000,0.000,'2026-10-30 23:56:07','2026-10-30 23:56:07');
/*!40000 ALTER TABLE `branch_stocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_main_branch` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branches_branch_code_unique` (`branch_code`),
  KEY `branches_is_active_index` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES (1,'MAIN','Main Branch','Downtown Central Market','124, Commercial Road, Central Market','+91 98765 43210','main@greenmart.pos',1,1,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(2,'NORTH','North Annex','North Avenue Commercial Hub','Shop 12, North Commercial Complex','+91 98765 43211','north@greenmart.pos',0,1,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(3,'METRO','Metro Center','Sector 4 City Galleria','Galleria Mall Lower Ground','+91 98765 43212','metro@greenmart.pos',0,1,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(4,'AIRPORT','Airport Express','Terminal 2 Departure Hall','T2 Departures Kiosk 4','+91 98765 43213','airport@greenmart.pos',0,1,'2026-10-30 23:03:56','2026-10-30 23:03:56');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brands`
--

DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `logo_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `brands_code_unique` (`code`),
  KEY `brands_name_index` (`name`),
  KEY `brands_is_active_index` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
INSERT INTO `brands` VALUES (1,'Fresh Farms','BR-FF','Fresh farm produce and daily essentials',NULL,1,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(2,'Organic Valley','BR-OV','Certified organic pulses and grains',NULL,1,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(3,'Heritage Dairy','BR-HD','Pure milk and dairy products',NULL,1,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(4,'Golden Harvest','BR-GH','Flours, rice and edible oils',NULL,1,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(5,'GreenMart Select','BR-GMS','House brand packaged commodities',NULL,1,'2026-10-30 23:56:07','2026-10-30 23:56:07');
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_features`
--

DROP TABLE IF EXISTS `business_features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `business_features` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `feature_key` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `config_payload` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `business_features_feature_key_unique` (`feature_key`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_features`
--

LOCK TABLES `business_features` WRITE;
/*!40000 ALTER TABLE `business_features` DISABLE KEYS */;
INSERT INTO `business_features` VALUES (1,'weightScaleBilling',1,NULL,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(2,'perishableStock',1,NULL,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(3,'batchAndExpiry',1,NULL,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(4,'sizeColorVariants',1,NULL,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(5,'jewelleryPurityAndMakingCharges',0,NULL,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(6,'tableManagement',0,NULL,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(7,'kitchenOrderTicket',0,NULL,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(8,'barcodeScanning',1,NULL,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(9,'wholesaleTiers',0,NULL,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(10,'serialNumberTracking',0,NULL,'2026-10-30 23:03:56','2026-10-30 23:03:56');
/*!40000 ALTER TABLE `business_features` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_profiles`
--

DROP TABLE IF EXISTS `business_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `business_profiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `legal_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency_code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `currency_symbol` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '₹',
  `timezone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Asia/Kolkata',
  `active_vertical` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'supermarket',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_profiles`
--

LOCK TABLES `business_profiles` WRITE;
/*!40000 ALTER TABLE `business_profiles` DISABLE KEYS */;
INSERT INTO `business_profiles` VALUES (1,'Green Mart Supermarket','Green Mart Retail Private Limited','GSTIN33AABCG1234F1Z5','INR','₹','Asia/Kolkata','supermarket','manager@greenmart.pos','+91 98765 43210','124, Commercial Road, Central Market','2026-10-30 23:03:56','2026-10-30 23:03:56');
/*!40000 ALTER TABLE `business_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_movements`
--

DROP TABLE IF EXISTS `cash_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_movements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cash_register_shift_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cash_movements_branch_id_foreign` (`branch_id`),
  KEY `cash_movements_user_id_foreign` (`user_id`),
  KEY `cash_movements_cash_register_shift_id_type_index` (`cash_register_shift_id`,`type`),
  CONSTRAINT `cash_movements_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cash_movements_cash_register_shift_id_foreign` FOREIGN KEY (`cash_register_shift_id`) REFERENCES `cash_register_shifts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cash_movements_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_movements`
--

LOCK TABLES `cash_movements` WRITE;
/*!40000 ALTER TABLE `cash_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_register_shifts`
--

DROP TABLE IF EXISTS `cash_register_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_register_shifts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `opened_at` timestamp NOT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `opening_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cash_sales_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cash_in_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cash_out_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `expected_closing_balance` decimal(12,2) DEFAULT NULL,
  `actual_closing_balance` decimal(12,2) DEFAULT NULL,
  `difference` decimal(12,2) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `opening_notes` text COLLATE utf8mb4_unicode_ci,
  `closing_notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cash_register_shifts_branch_id_status_index` (`branch_id`,`status`),
  KEY `cash_register_shifts_user_id_status_index` (`user_id`,`status`),
  KEY `cash_register_shifts_status_index` (`status`),
  CONSTRAINT `cash_register_shifts_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cash_register_shifts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_register_shifts`
--

LOCK TABLES `cash_register_shifts` WRITE;
/*!40000 ALTER TABLE `cash_register_shifts` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_register_shifts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint unsigned DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_slug_unique` (`slug`),
  KEY `categories_parent_id_is_active_index` (`parent_id`,`is_active`),
  CONSTRAINT `categories_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,NULL,'Dairy & Eggs','dairy-eggs','Milk, yogurt, cheeses, and eggs',NULL,1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(2,NULL,'Fresh Produce','fresh-produce','Farm fresh vegetables and fruits',NULL,1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(3,2,'Vegetables','vegetables','Fresh seasonal vegetables',NULL,1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(4,2,'Fruits','fruits','Fresh seasonal fruits',NULL,1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(5,NULL,'Groceries & Staples','groceries','Flours, grains, pulses, and spices',NULL,1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(6,NULL,'Bakery & Snacks','bakery-snacks','Breads, buns, cookies, and chips',NULL,1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(7,NULL,'Beverages','beverages','Tea, coffee, juices, and soft drinks',NULL,1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(8,NULL,'Apparel & Clothing','apparel','Garments and retail textiles',NULL,1,'2026-10-30 23:03:58','2026-10-30 23:03:58');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_groups`
--

DROP TABLE IF EXISTS `customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_groups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `credit_limit` decimal(12,2) NOT NULL DEFAULT '0.00',
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_groups_code_unique` (`code`),
  KEY `customer_groups_code_index` (`code`),
  KEY `customer_groups_is_active_index` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_groups`
--

LOCK TABLES `customer_groups` WRITE;
/*!40000 ALTER TABLE `customer_groups` DISABLE KEYS */;
INSERT INTO `customer_groups` VALUES (1,'Regular Retail','RETAIL',0.00,5000.00,'Standard walk-in retail customers',1,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(2,'Wholesale Tier 1','WHOLESALE',5.00,50000.00,'Bulk commercial buyers',1,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(3,'VIP Members','VIP',3.00,20000.00,'Enrolled loyalty card members',1,'2026-10-30 23:56:07','2026-10-30 23:56:07'),(4,'Corporate Accounts','CORP',7.50,100000.00,'Corporate and institutional clients',1,'2026-10-30 23:56:07','2026-10-30 23:56:07');
/*!40000 ALTER TABLE `customer_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_ledgers`
--

DROP TABLE IF EXISTS `customer_ledgers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_ledgers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned DEFAULT NULL,
  `transaction_type` enum('opening_balance','sale','payment','return','credit_adjustment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `debit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `credit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `running_balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_ledgers_branch_id_foreign` (`branch_id`),
  KEY `customer_ledgers_customer_id_index` (`customer_id`),
  KEY `customer_ledgers_transaction_date_index` (`transaction_date`),
  CONSTRAINT `customer_ledgers_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `customer_ledgers_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_ledgers`
--

LOCK TABLES `customer_ledgers` WRITE;
/*!40000 ALTER TABLE `customer_ledgers` DISABLE KEYS */;
INSERT INTO `customer_ledgers` VALUES (1,2,1,'opening_balance','opening',NULL,'2026-10-01',1250.00,0.00,1250.00,'Opening credit balance brought forward','2026-10-30 23:56:07','2026-10-30 23:56:07');
/*!40000 ALTER TABLE `customer_ledgers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_loyalty_transactions`
--

DROP TABLE IF EXISTS `customer_loyalty_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_loyalty_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL,
  `sales_order_id` bigint unsigned DEFAULT NULL,
  `type` enum('earned','redeemed','expired','adjustment') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'earned',
  `points` int NOT NULL,
  `conversion_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_loyalty_transactions_sales_order_id_foreign` (`sales_order_id`),
  KEY `customer_loyalty_transactions_customer_id_index` (`customer_id`),
  CONSTRAINT `customer_loyalty_transactions_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_loyalty_transactions_sales_order_id_foreign` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_loyalty_transactions`
--

LOCK TABLES `customer_loyalty_transactions` WRITE;
/*!40000 ALTER TABLE `customer_loyalty_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_loyalty_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_group_id` bigint unsigned DEFAULT NULL,
  `customer_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'retail',
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alternate_phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credit_limit` decimal(12,2) NOT NULL DEFAULT '0.00',
  `opening_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `current_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `loyalty_points` int NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_customer_code_unique` (`customer_code`),
  KEY `customers_name_index` (`name`),
  KEY `customers_phone_index` (`phone`),
  KEY `customers_email_index` (`email`),
  KEY `customers_is_active_index` (`is_active`),
  KEY `customers_customer_group_id_foreign` (`customer_group_id`),
  CONSTRAINT `customers_customer_group_id_foreign` FOREIGN KEY (`customer_group_id`) REFERENCES `customer_groups` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'CUST-00001',1,'retail','Walk-in Retail Customer','+91 99999 00000',NULL,'walkin@store.local','Counter Cash Sales','Central City','Tamil Nadu','600001',NULL,5000.00,0.00,0.00,150,'Default walk-in counter customer record',1,'2026-10-30 23:03:59','2026-10-30 23:56:07',NULL),(2,'CUST-00002',2,'wholesale','John Doe','+91 98111 22334','+91 98111 99887','john.doe@example.com','42, Sunset Boulevard, Flat 3B','Central Market','Tamil Nadu','600002',NULL,50000.00,1250.00,1250.00,300,'Regular grocery customer, prefers evening deliveries',1,'2026-10-30 23:03:59','2026-10-30 23:56:07',NULL),(3,'CUST-00003',3,'vip','Sarah Jenkins','+91 98222 33445',NULL,'sarah.jenkins@example.com','15, North Lake Avenue','North City','Tamil Nadu','600018',NULL,20000.00,0.00,0.00,450,'Organic section regular buyer',1,'2026-10-30 23:03:59','2026-10-30 23:56:07',NULL),(4,'CUST-00004',4,'corp','TechCorp Solutions Pvt Ltd','+91 98777 66554','+91 44 2828 1234','procurement@techcorp.com','Tech Park Tower 4, Sector 7','Central City','Tamil Nadu','600113','GSTIN33AABCT9988K1Z3',100000.00,0.00,0.00,600,'Corporate account for pantry and office supplies',1,'2026-10-30 23:03:59','2026-10-30 23:56:07',NULL),(5,'CUST-00005',1,'retail','Anita Sharma','+91 98444 55667',NULL,'anita.sharma@example.com','88, Garden Road, Phase 2','North City','Tamil Nadu','600040',NULL,5000.00,0.00,0.00,750,'Inactive customer profile for testing filters',0,'2026-10-30 23:03:59','2026-10-30 23:56:07',NULL);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `goods_receipt_items`
--

DROP TABLE IF EXISTS `goods_receipt_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goods_receipt_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `goods_receipt_note_id` bigint unsigned NOT NULL,
  `purchase_order_item_id` bigint unsigned DEFAULT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `received_quantity` decimal(12,3) NOT NULL,
  `accepted_quantity` decimal(12,3) NOT NULL,
  `damaged_quantity` decimal(12,3) NOT NULL DEFAULT '0.000',
  `rejected_quantity` decimal(12,3) NOT NULL DEFAULT '0.000',
  `unit_cost` decimal(12,2) NOT NULL,
  `batch_number` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `goods_receipt_items_purchase_order_item_id_foreign` (`purchase_order_item_id`),
  KEY `goods_receipt_items_variant_id_foreign` (`variant_id`),
  KEY `goods_receipt_items_goods_receipt_note_id_index` (`goods_receipt_note_id`),
  KEY `goods_receipt_items_product_id_index` (`product_id`),
  CONSTRAINT `goods_receipt_items_goods_receipt_note_id_foreign` FOREIGN KEY (`goods_receipt_note_id`) REFERENCES `goods_receipt_notes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `goods_receipt_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `goods_receipt_items_purchase_order_item_id_foreign` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `goods_receipt_items_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `goods_receipt_items`
--

LOCK TABLES `goods_receipt_items` WRITE;
/*!40000 ALTER TABLE `goods_receipt_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `goods_receipt_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `goods_receipt_notes`
--

DROP TABLE IF EXISTS `goods_receipt_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goods_receipt_notes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `grn_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_order_id` bigint unsigned DEFAULT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `supplier_id` bigint unsigned NOT NULL,
  `received_by` bigint unsigned NOT NULL,
  `receipt_date` datetime NOT NULL,
  `status` enum('completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `supplier_invoice_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_invoice_date` date DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `goods_receipt_notes_grn_number_unique` (`grn_number`),
  KEY `goods_receipt_notes_received_by_foreign` (`received_by`),
  KEY `goods_receipt_notes_purchase_order_id_index` (`purchase_order_id`),
  KEY `goods_receipt_notes_branch_id_index` (`branch_id`),
  KEY `goods_receipt_notes_supplier_id_index` (`supplier_id`),
  CONSTRAINT `goods_receipt_notes_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `goods_receipt_notes_purchase_order_id_foreign` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `goods_receipt_notes_received_by_foreign` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `goods_receipt_notes_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `goods_receipt_notes`
--

LOCK TABLES `goods_receipt_notes` WRITE;
/*!40000 ALTER TABLE `goods_receipt_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `goods_receipt_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_10_30_071430_create_personal_access_tokens_table',1),(5,'2026_10_30_071431_create_business_profiles_table',1),(6,'2026_10_30_071432_create_business_features_table',1),(7,'2026_10_30_071433_create_tax_slabs_table',1),(8,'2026_10_30_071434_create_branches_table',1),(9,'2026_10_30_071435_create_roles_and_permissions_tables',1),(10,'2026_10_30_071436_create_user_branch_roles_table',1),(11,'2026_10_30_071437_create_audit_logs_table',1),(12,'2026_10_30_072001_create_categories_table',1),(13,'2026_10_30_072002_create_units_table',1),(14,'2026_10_30_072003_create_products_table',1),(15,'2026_10_30_072004_create_product_variants_table',1),(16,'2026_10_30_072005_create_branch_product_prices_table',1),(17,'2026_10_30_082001_add_attribute_fingerprint_to_product_variants_table',1),(18,'2026_10_30_090001_create_customers_table',1),(19,'2026_10_30_090002_create_suppliers_table',1),(20,'2026_10_31_100001_create_cash_registers_and_shifts_table',1),(21,'2026_10_31_100002_create_sales_orders_and_items_table',1),(22,'2026_10_31_100003_create_sales_payments_table',1),(23,'2026_10_31_110001_create_brands_table_and_add_product_fields',2),(24,'2026_10_31_110002_create_inventory_tables',2),(25,'2026_10_31_110003_create_purchase_tables',2),(26,'2026_10_31_110004_create_customer_enhancements_tables',2),(27,'2026_10_31_110005_create_app_settings_table',2);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_slug_unique` (`slug`),
  KEY `permissions_module_index` (`module`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'pos.billing','sales','Execute counter POS sales transactions','2026-10-30 23:03:56','2026-10-30 23:03:56'),(2,'pos.discount','sales','Apply custom discounts to bills','2026-10-30 23:03:56','2026-10-30 23:03:56'),(3,'pos.returns','sales','Process customer returns and refunds','2026-10-30 23:03:57','2026-10-30 23:03:57'),(4,'cash.drawer','sales','Open, close, and reconcile cashier cash drawers','2026-10-30 23:03:57','2026-10-30 23:03:57'),(5,'catalog.manage','products','Create and modify product catalog and prices','2026-10-30 23:03:57','2026-10-30 23:03:57'),(6,'inventory.adjust','inventory','Create stock adjustments and write-offs','2026-10-30 23:03:57','2026-10-30 23:03:57'),(7,'inventory.transfer','inventory','Dispatch and receive inter-branch transfers','2026-10-30 23:03:57','2026-10-30 23:03:57'),(8,'purchases.manage','purchases','Create POs and record GRN receipts','2026-10-30 23:03:57','2026-10-30 23:03:57'),(9,'customers.manage','customers','Manage customer profiles and credit limits','2026-10-30 23:03:57','2026-10-30 23:03:57'),(10,'suppliers.manage','suppliers','Manage supplier profiles and vendor directory','2026-10-30 23:03:57','2026-10-30 23:03:57'),(11,'reports.view_pnl','reports','View P&L and financial statements','2026-10-30 23:03:57','2026-10-30 23:03:57'),(12,'settings.manage','settings','Manage store profile and hardware setup','2026-10-30 23:03:57','2026-10-30 23:03:57');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (1,'App\\Models\\User',1,'pos_auth_token','5563c7e71a640c00f434d5e1eea3275120c51e9fc462d7e1af329bffb38d558e','[\"*\"]','2026-10-31 01:48:15',NULL,'2026-10-31 00:17:41','2026-10-31 01:48:15'),(2,'App\\Models\\User',1,'pos_auth_token','0ba2a811c8eaf83aec29ae7a92fb543a6717d18d51eafc62e64988c706512397','[\"*\"]','2026-10-31 00:18:00',NULL,'2026-10-31 00:18:00','2026-10-31 00:18:00'),(3,'App\\Models\\User',1,'pos_auth_token','22f3594fb323ca7232fed300b084c71d64fdea0513ff8bca58f96fa6f798254e','[\"*\"]','2026-10-31 00:18:18',NULL,'2026-10-31 00:18:18','2026-10-31 00:18:18'),(4,'App\\Models\\User',1,'pos_auth_token','d60ce94493a792b9316cfad3abe63f0866545bca64df92a56aa32d640ce55845','[\"*\"]','2026-10-31 00:18:31',NULL,'2026-10-31 00:18:31','2026-10-31 00:18:31'),(5,'App\\Models\\User',1,'pos_auth_token','ae4cdb219a7616602380c3ea468e268fc7019d53bc96763f41a045e0b9c0a466','[\"*\"]','2026-10-31 00:19:02',NULL,'2026-10-31 00:19:02','2026-10-31 00:19:02'),(6,'App\\Models\\User',1,'pos_auth_token','e46310276f699158bd345f3b2337c3e2eaa0b123bc7d8adad8d18064e9d765dc','[\"*\"]',NULL,NULL,'2026-10-31 01:22:19','2026-10-31 01:22:19'),(7,'App\\Models\\User',1,'test-token','dff55ab34039a50eb82f090ba28166f746c4487a100de678e4cb6d600a5bddd5','[\"*\"]',NULL,NULL,'2026-10-31 01:26:09','2026-10-31 01:26:09'),(8,'App\\Models\\User',1,'pos_auth_token','b0ca85dd7656c53cb8110725e68f32c8b282c839be6920ec7036fb2e9bb28e46','[\"*\"]',NULL,NULL,'2026-10-31 01:26:45','2026-10-31 01:26:45'),(9,'App\\Models\\User',1,'pos_auth_token','eae4fcb295ad4ebecfce028919e3f7ec8686d8baef72412acb4b791b05fcd058','[\"*\"]','2026-10-31 01:36:40',NULL,'2026-10-31 01:36:39','2026-10-31 01:36:40');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_variants`
--

DROP TABLE IF EXISTS `product_variants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_variants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `variant_sku` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `variant_barcode` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attributes_json` json NOT NULL,
  `attribute_fingerprint` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cost_price` decimal(12,2) DEFAULT NULL,
  `selling_price` decimal(12,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_variants_variant_sku_unique` (`variant_sku`),
  UNIQUE KEY `product_variants_variant_barcode_unique` (`variant_barcode`),
  UNIQUE KEY `uq_product_variant_attributes` (`product_id`,`attribute_fingerprint`),
  KEY `product_variants_product_id_is_active_index` (`product_id`,`is_active`),
  KEY `product_variants_variant_barcode_index` (`variant_barcode`),
  CONSTRAINT `product_variants_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_variants`
--

LOCK TABLES `product_variants` WRITE;
/*!40000 ALTER TABLE `product_variants` DISABLE KEYS */;
INSERT INTO `product_variants` VALUES (1,6,'APP-TSHIRT-BLK-M','8901234567801','{\"size\": \"M\", \"color\": \"Black\"}','eb3124fc39e216dfe090e78568886e1c331c60f8dff84204c2549ec0ea4b44d2',250.00,499.00,1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(2,6,'APP-TSHIRT-BLK-L','8901234567802','{\"size\": \"L\", \"color\": \"Black\"}','f0d6f68145c590a8e1db3ad3326251577df59bf91b5802609550bf657b3304d9',250.00,499.00,1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(3,6,'APP-TSHIRT-WHT-M','8901234567803','{\"size\": \"M\", \"color\": \"White\"}','2e22ad8d4f8054d78db8cb4a3ec1599348b5d541f45dda1476091787b10cea60',250.00,499.00,1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(4,6,'APP-TSHIRT-WHT-L','8901234567804','{\"size\": \"L\", \"color\": \"White\"}','9dd6f85e3126a2751d27775a8cbf985cc692512ef33959c1650051b974c72fbc',250.00,499.00,1,'2026-10-30 23:03:58','2026-10-30 23:03:58');
/*!40000 ALTER TABLE `product_variants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `category_id` bigint unsigned NOT NULL,
  `brand_id` bigint unsigned DEFAULT NULL,
  `unit_id` bigint unsigned NOT NULL,
  `tax_slab_id` bigint unsigned DEFAULT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `barcode` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hsn_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `is_tax_inclusive` tinyint(1) NOT NULL DEFAULT '1',
  `cost_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `selling_price` decimal(12,2) NOT NULL,
  `mrp` decimal(12,2) NOT NULL DEFAULT '0.00',
  `minimum_stock` decimal(10,3) NOT NULL DEFAULT '5.000',
  `has_variants` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `metadata` json DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_sku_unique` (`sku`),
  UNIQUE KEY `products_barcode_unique` (`barcode`),
  KEY `products_unit_id_foreign` (`unit_id`),
  KEY `products_tax_slab_id_foreign` (`tax_slab_id`),
  KEY `products_name_index` (`name`),
  KEY `products_category_id_index` (`category_id`),
  KEY `products_is_active_index` (`is_active`),
  KEY `products_brand_id_foreign` (`brand_id`),
  CONSTRAINT `products_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL,
  CONSTRAINT `products_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `products_tax_slab_id_foreign` FOREIGN KEY (`tax_slab_id`) REFERENCES `tax_slabs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `products_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,1,1,4,2,'Whole Milk 1L','MILK-1L','8901234567890','0401',5.00,1,50.00,60.00,69.00,20.000,0,1,NULL,'High quality Whole Milk 1L stocked fresh daily.',NULL,'2026-10-30 23:03:58','2026-10-30 23:56:07',NULL),(2,1,2,6,1,'Brown Organic Eggs (Pack of 6)','EGGS-BRN-6','8901234567891','0407',0.00,1,65.00,85.00,97.75,15.000,0,1,NULL,'High quality Brown Organic Eggs (Pack of 6) stocked fresh daily.',NULL,'2026-10-30 23:03:58','2026-10-30 23:56:07',NULL),(3,3,3,2,1,'Organic Red Tomato','VEG-TOMATO','8901234567892','0702',0.00,1,25.00,38.00,43.70,50.000,0,1,NULL,'High quality Organic Red Tomato stocked fresh daily.',NULL,'2026-10-30 23:03:58','2026-10-30 23:56:07',NULL),(4,6,4,1,2,'Artisan Sourdough Bread','BAK-SOURDOUGH','8901234567893','1905',5.00,1,40.00,65.00,74.75,10.000,0,1,NULL,'High quality Artisan Sourdough Bread stocked fresh daily.',NULL,'2026-10-30 23:03:58','2026-10-30 23:56:07',NULL),(5,7,5,6,3,'Arabica Roast Coffee Beans 250g','BEV-COFFEE-250','8901234567894','0901',12.00,1,220.00,320.00,368.00,10.000,0,1,NULL,'High quality Arabica Roast Coffee Beans 250g stocked fresh daily.',NULL,'2026-10-30 23:03:58','2026-10-30 23:56:07',NULL),(6,8,1,1,3,'Classic Cotton Crewneck T-Shirt','APP-CREW-TSHIRT',NULL,'6109',12.00,1,250.00,499.00,573.85,20.000,1,1,NULL,'High quality Classic Cotton Crewneck T-Shirt stocked fresh daily.',NULL,'2026-10-30 23:03:58','2026-10-30 23:56:07',NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_invoices`
--

DROP TABLE IF EXISTS `purchase_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_invoices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_order_id` bigint unsigned DEFAULT NULL,
  `goods_receipt_note_id` bigint unsigned DEFAULT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `supplier_id` bigint unsigned NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `subtotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(14,2) NOT NULL,
  `paid_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `payment_status` enum('unpaid','partially_paid','paid') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unpaid',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_invoices_invoice_number_unique` (`invoice_number`),
  KEY `purchase_invoices_purchase_order_id_foreign` (`purchase_order_id`),
  KEY `purchase_invoices_goods_receipt_note_id_foreign` (`goods_receipt_note_id`),
  KEY `purchase_invoices_branch_id_index` (`branch_id`),
  KEY `purchase_invoices_supplier_id_index` (`supplier_id`),
  KEY `purchase_invoices_payment_status_index` (`payment_status`),
  CONSTRAINT `purchase_invoices_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_invoices_goods_receipt_note_id_foreign` FOREIGN KEY (`goods_receipt_note_id`) REFERENCES `goods_receipt_notes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_invoices_purchase_order_id_foreign` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_invoices_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_invoices`
--

LOCK TABLES `purchase_invoices` WRITE;
/*!40000 ALTER TABLE `purchase_invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `purchase_order_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `ordered_quantity` decimal(12,3) NOT NULL,
  `received_quantity` decimal(12,3) NOT NULL DEFAULT '0.000',
  `unit_cost` decimal(12,2) NOT NULL,
  `discount_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(14,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_order_items_variant_id_foreign` (`variant_id`),
  KEY `purchase_order_items_purchase_order_id_index` (`purchase_order_id`),
  KEY `purchase_order_items_product_id_index` (`product_id`),
  CONSTRAINT `purchase_order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_purchase_order_id_foreign` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `po_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `supplier_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `order_date` date NOT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `status` enum('draft','pending','partially_received','received','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `subtotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_orders_po_number_unique` (`po_number`),
  KEY `purchase_orders_user_id_foreign` (`user_id`),
  KEY `purchase_orders_branch_id_index` (`branch_id`),
  KEY `purchase_orders_supplier_id_index` (`supplier_id`),
  KEY `purchase_orders_status_index` (`status`),
  KEY `purchase_orders_order_date_index` (`order_date`),
  CONSTRAINT `purchase_orders_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_orders_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `purchase_orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_payments`
--

DROP TABLE IF EXISTS `purchase_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_invoice_id` bigint unsigned NOT NULL,
  `supplier_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `payment_method` enum('cash','card','bank_transfer','cheque','upi') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `transaction_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_payments_payment_number_unique` (`payment_number`),
  KEY `purchase_payments_branch_id_foreign` (`branch_id`),
  KEY `purchase_payments_user_id_foreign` (`user_id`),
  KEY `purchase_payments_purchase_invoice_id_index` (`purchase_invoice_id`),
  KEY `purchase_payments_supplier_id_index` (`supplier_id`),
  CONSTRAINT `purchase_payments_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_payments_purchase_invoice_id_foreign` FOREIGN KEY (`purchase_invoice_id`) REFERENCES `purchase_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_payments_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `purchase_payments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_payments`
--

LOCK TABLES `purchase_payments` WRITE;
/*!40000 ALTER TABLE `purchase_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_return_items`
--

DROP TABLE IF EXISTS `purchase_return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_return_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `purchase_return_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `quantity` decimal(12,3) NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL,
  `tax_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(14,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_return_items_purchase_return_id_foreign` (`purchase_return_id`),
  KEY `purchase_return_items_product_id_foreign` (`product_id`),
  KEY `purchase_return_items_variant_id_foreign` (`variant_id`),
  CONSTRAINT `purchase_return_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_return_items_purchase_return_id_foreign` FOREIGN KEY (`purchase_return_id`) REFERENCES `purchase_returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_return_items_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_return_items`
--

LOCK TABLES `purchase_return_items` WRITE;
/*!40000 ALTER TABLE `purchase_return_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_return_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_returns`
--

DROP TABLE IF EXISTS `purchase_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_returns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `return_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_invoice_id` bigint unsigned DEFAULT NULL,
  `supplier_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `return_date` date NOT NULL,
  `subtotal` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(14,2) NOT NULL,
  `reason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_returns_return_number_unique` (`return_number`),
  KEY `purchase_returns_purchase_invoice_id_foreign` (`purchase_invoice_id`),
  KEY `purchase_returns_user_id_foreign` (`user_id`),
  KEY `purchase_returns_supplier_id_index` (`supplier_id`),
  KEY `purchase_returns_branch_id_index` (`branch_id`),
  CONSTRAINT `purchase_returns_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_returns_purchase_invoice_id_foreign` FOREIGN KEY (`purchase_invoice_id`) REFERENCES `purchase_invoices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_returns_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `purchase_returns_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_returns`
--

LOCK TABLES `purchase_returns` WRITE;
/*!40000 ALTER TABLE `purchase_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `role_permissions_permission_id_foreign` (`permission_id`),
  CONSTRAINT `role_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1),(2,1),(3,1),(1,2),(2,2),(1,3),(2,3),(1,4),(2,4),(3,4),(1,5),(1,6),(2,6),(4,6),(1,7),(2,7),(4,7),(1,8),(4,8),(5,8),(1,9),(2,9),(1,10),(2,10),(5,10),(1,11),(2,11),(5,11),(1,12);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Administrator','admin','Full administrative access to store configuration and operations',1,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(2,'Branch Manager','branch_manager','Oversees daily sales, cashier registers, and inventory in assigned branch',1,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(3,'Cashier','cashier','Operates counter billing, orders, and customer checkout',1,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(4,'Inventory Clerk','inventory_clerk','Manages stock counts, adjustments, and branch transfers',1,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(5,'Accountant','accountant','Audits financial P&L, taxes, and supplier payables',1,'2026-10-30 23:03:56','2026-10-30 23:03:56');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_order_items`
--

DROP TABLE IF EXISTS `sales_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sales_order_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `product_variant_id` bigint unsigned DEFAULT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `variant_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `barcode` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(12,3) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `discount_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_slab_id` bigint unsigned DEFAULT NULL,
  `tax_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cgst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `sgst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `igst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `is_tax_inclusive` tinyint(1) NOT NULL DEFAULT '0',
  `subtotal` decimal(12,2) NOT NULL,
  `total` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_order_items_product_id_foreign` (`product_id`),
  KEY `sales_order_items_product_variant_id_foreign` (`product_variant_id`),
  KEY `sales_order_items_tax_slab_id_foreign` (`tax_slab_id`),
  KEY `sales_order_items_sales_order_id_product_id_index` (`sales_order_id`,`product_id`),
  CONSTRAINT `sales_order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_order_items_product_variant_id_foreign` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_order_items_sales_order_id_foreign` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_order_items_tax_slab_id_foreign` FOREIGN KEY (`tax_slab_id`) REFERENCES `tax_slabs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_order_items`
--

LOCK TABLES `sales_order_items` WRITE;
/*!40000 ALTER TABLE `sales_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_orders`
--

DROP TABLE IF EXISTS `sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `cash_register_shift_id` bigint unsigned DEFAULT NULL,
  `invoice_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_date` datetime NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'paid',
  `is_gst_bill` tinyint(1) NOT NULL DEFAULT '1',
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_rate` decimal(5,2) DEFAULT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cgst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `sgst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `igst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `round_off` decimal(8,2) NOT NULL DEFAULT '0.00',
  `grand_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `change_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_orders_invoice_number_unique` (`invoice_number`),
  KEY `sales_orders_user_id_foreign` (`user_id`),
  KEY `sales_orders_customer_id_foreign` (`customer_id`),
  KEY `sales_orders_cash_register_shift_id_foreign` (`cash_register_shift_id`),
  KEY `sales_orders_branch_id_order_date_index` (`branch_id`,`order_date`),
  KEY `sales_orders_branch_id_status_index` (`branch_id`,`status`),
  KEY `sales_orders_order_date_index` (`order_date`),
  KEY `sales_orders_status_index` (`status`),
  KEY `sales_orders_payment_status_index` (`payment_status`),
  CONSTRAINT `sales_orders_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_orders_cash_register_shift_id_foreign` FOREIGN KEY (`cash_register_shift_id`) REFERENCES `cash_register_shifts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_orders_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_orders`
--

LOCK TABLES `sales_orders` WRITE;
/*!40000 ALTER TABLE `sales_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_payments`
--

DROP TABLE IF EXISTS `sales_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sales_order_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `cash_register_shift_id` bigint unsigned DEFAULT NULL,
  `payment_method` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'successful',
  `payment_date` datetime NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_payments_user_id_foreign` (`user_id`),
  KEY `sales_payments_sales_order_id_status_index` (`sales_order_id`,`status`),
  KEY `sales_payments_branch_id_payment_method_index` (`branch_id`,`payment_method`),
  KEY `sales_payments_cash_register_shift_id_payment_method_index` (`cash_register_shift_id`,`payment_method`),
  CONSTRAINT `sales_payments_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_payments_cash_register_shift_id_foreign` FOREIGN KEY (`cash_register_shift_id`) REFERENCES `cash_register_shifts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_payments_sales_order_id_foreign` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_payments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_payments`
--

LOCK TABLES `sales_payments` WRITE;
/*!40000 ALTER TABLE `sales_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_adjustment_items`
--

DROP TABLE IF EXISTS `stock_adjustment_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_adjustment_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `stock_adjustment_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `quantity_adjusted` decimal(12,3) NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_adjustment_items_stock_adjustment_id_foreign` (`stock_adjustment_id`),
  KEY `stock_adjustment_items_product_id_foreign` (`product_id`),
  KEY `stock_adjustment_items_variant_id_foreign` (`variant_id`),
  CONSTRAINT `stock_adjustment_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_adjustment_items_stock_adjustment_id_foreign` FOREIGN KEY (`stock_adjustment_id`) REFERENCES `stock_adjustments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_adjustment_items_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_adjustment_items`
--

LOCK TABLES `stock_adjustment_items` WRITE;
/*!40000 ALTER TABLE `stock_adjustment_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_adjustment_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_adjustments`
--

DROP TABLE IF EXISTS `stock_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_adjustments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `adjustment_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `reason` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('addition','subtraction','damage','physical_count') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'addition',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stock_adjustments_adjustment_number_unique` (`adjustment_number`),
  KEY `stock_adjustments_user_id_foreign` (`user_id`),
  KEY `stock_adjustments_branch_id_index` (`branch_id`),
  KEY `stock_adjustments_created_at_index` (`created_at`),
  CONSTRAINT `stock_adjustments_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_adjustments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_adjustments`
--

LOCK TABLES `stock_adjustments` WRITE;
/*!40000 ALTER TABLE `stock_adjustments` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_batches`
--

DROP TABLE IF EXISTS `stock_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_batches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `batch_number` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `manufacturing_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `quantity` decimal(12,3) NOT NULL DEFAULT '0.000',
  `cost_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `selling_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('active','expired','depleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_batches_product_id_foreign` (`product_id`),
  KEY `stock_batches_variant_id_foreign` (`variant_id`),
  KEY `stock_batches_branch_id_product_id_index` (`branch_id`,`product_id`),
  KEY `stock_batches_batch_number_index` (`batch_number`),
  KEY `stock_batches_expiry_date_index` (`expiry_date`),
  CONSTRAINT `stock_batches_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_batches_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_batches_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_batches`
--

LOCK TABLES `stock_batches` WRITE;
/*!40000 ALTER TABLE `stock_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `product_variant_id` bigint unsigned DEFAULT NULL,
  `movement_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(12,3) NOT NULL,
  `previous_quantity` decimal(12,3) NOT NULL DEFAULT '0.000',
  `new_quantity` decimal(12,3) NOT NULL DEFAULT '0.000',
  `unit_cost` decimal(12,2) DEFAULT NULL,
  `reference_type` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `reason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_movements_product_id_foreign` (`product_id`),
  KEY `stock_movements_product_variant_id_foreign` (`product_variant_id`),
  KEY `stock_movements_user_id_foreign` (`user_id`),
  KEY `stock_movements_branch_id_product_id_index` (`branch_id`,`product_id`),
  KEY `stock_movements_movement_type_index` (`movement_type`),
  KEY `stock_movements_created_at_index` (`created_at`),
  CONSTRAINT `stock_movements_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_movements_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_movements_product_variant_id_foreign` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `stock_movements_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES (1,1,1,NULL,'initial',45.000,0.000,45.000,50.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(2,1,2,NULL,'initial',3.000,0.000,3.000,65.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(3,1,4,NULL,'initial',120.000,0.000,120.000,40.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(4,1,5,NULL,'initial',25.000,0.000,25.000,220.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(5,1,6,NULL,'initial',45.000,0.000,45.000,250.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(6,2,1,NULL,'initial',45.000,0.000,45.000,50.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(7,2,2,NULL,'initial',3.000,0.000,3.000,65.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(8,2,4,NULL,'initial',120.000,0.000,120.000,40.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(9,2,5,NULL,'initial',25.000,0.000,25.000,220.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(10,2,6,NULL,'initial',45.000,0.000,45.000,250.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(11,3,1,NULL,'initial',45.000,0.000,45.000,50.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(12,3,2,NULL,'initial',3.000,0.000,3.000,65.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(13,3,4,NULL,'initial',120.000,0.000,120.000,40.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(14,3,5,NULL,'initial',25.000,0.000,25.000,220.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(15,3,6,NULL,'initial',45.000,0.000,45.000,250.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(16,4,1,NULL,'initial',45.000,0.000,45.000,50.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(17,4,2,NULL,'initial',3.000,0.000,3.000,65.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(18,4,4,NULL,'initial',120.000,0.000,120.000,40.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(19,4,5,NULL,'initial',25.000,0.000,25.000,220.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07'),(20,4,6,NULL,'initial',45.000,0.000,45.000,250.00,'opening_stock',NULL,'Store initial inventory setup',NULL,1,'2026-10-15 23:56:07','2026-10-30 23:56:07');
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_transfer_items`
--

DROP TABLE IF EXISTS `stock_transfer_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_transfer_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `stock_transfer_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `quantity_sent` decimal(12,3) NOT NULL,
  `quantity_received` decimal(12,3) NOT NULL DEFAULT '0.000',
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_transfer_items_stock_transfer_id_foreign` (`stock_transfer_id`),
  KEY `stock_transfer_items_product_id_foreign` (`product_id`),
  KEY `stock_transfer_items_variant_id_foreign` (`variant_id`),
  CONSTRAINT `stock_transfer_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_transfer_items_stock_transfer_id_foreign` FOREIGN KEY (`stock_transfer_id`) REFERENCES `stock_transfers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_transfer_items_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transfer_items`
--

LOCK TABLES `stock_transfer_items` WRITE;
/*!40000 ALTER TABLE `stock_transfer_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_transfer_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_transfers`
--

DROP TABLE IF EXISTS `stock_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_transfers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `transfer_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_branch_id` bigint unsigned NOT NULL,
  `destination_branch_id` bigint unsigned NOT NULL,
  `status` enum('draft','dispatched','received','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'dispatched',
  `dispatch_date` datetime DEFAULT NULL,
  `receive_date` datetime DEFAULT NULL,
  `dispatched_by` bigint unsigned NOT NULL,
  `received_by` bigint unsigned DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stock_transfers_transfer_number_unique` (`transfer_number`),
  KEY `stock_transfers_dispatched_by_foreign` (`dispatched_by`),
  KEY `stock_transfers_received_by_foreign` (`received_by`),
  KEY `stock_transfers_source_branch_id_index` (`source_branch_id`),
  KEY `stock_transfers_destination_branch_id_index` (`destination_branch_id`),
  KEY `stock_transfers_status_index` (`status`),
  CONSTRAINT `stock_transfers_destination_branch_id_foreign` FOREIGN KEY (`destination_branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_transfers_dispatched_by_foreign` FOREIGN KEY (`dispatched_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_transfers_received_by_foreign` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `stock_transfers_source_branch_id_foreign` FOREIGN KEY (`source_branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transfers`
--

LOCK TABLES `stock_transfers` WRITE;
/*!40000 ALTER TABLE `stock_transfers` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_ledgers`
--

DROP TABLE IF EXISTS `supplier_ledgers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_ledgers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned DEFAULT NULL,
  `transaction_type` enum('opening_balance','purchase_invoice','payment','return','adjustment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `debit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `credit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `running_balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `supplier_ledgers_branch_id_foreign` (`branch_id`),
  KEY `supplier_ledgers_supplier_id_index` (`supplier_id`),
  KEY `supplier_ledgers_transaction_date_index` (`transaction_date`),
  CONSTRAINT `supplier_ledgers_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `supplier_ledgers_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_ledgers`
--

LOCK TABLES `supplier_ledgers` WRITE;
/*!40000 ALTER TABLE `supplier_ledgers` DISABLE KEYS */;
INSERT INTO `supplier_ledgers` VALUES (1,1,1,'opening_balance',NULL,NULL,'2026-09-16',0.00,14500.00,14500.00,'Opening vendor payable balance','2026-10-30 23:56:07','2026-10-30 23:56:07'),(2,2,1,'opening_balance',NULL,NULL,'2026-09-16',0.00,0.00,0.00,'Opening vendor payable balance','2026-10-30 23:56:07','2026-10-30 23:56:07'),(3,3,1,'opening_balance',NULL,NULL,'2026-09-16',0.00,0.00,0.00,'Opening vendor payable balance','2026-10-30 23:56:07','2026-10-30 23:56:07'),(4,4,1,'opening_balance',NULL,NULL,'2026-09-16',0.00,0.00,0.00,'Opening vendor payable balance','2026-10-30 23:56:07','2026-10-30 23:56:07');
/*!40000 ALTER TABLE `supplier_ledgers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `supplier_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alternate_phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `suppliers_supplier_code_unique` (`supplier_code`),
  KEY `suppliers_name_index` (`name`),
  KEY `suppliers_phone_index` (`phone`),
  KEY `suppliers_email_index` (`email`),
  KEY `suppliers_is_active_index` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (1,'SUP-00001','Fresh Farm Agro Wholesale','Ramesh Patel','+91 98100 11223','+91 98100 99881','orders@freshfarmagro.com','Plot 45, Agro Market Yard','Central Market','Tamil Nadu','600079','GSTIN33AABCF4567M1Z1','Primary vendor for fresh fruits and organic vegetables',1,'2026-10-30 23:03:59','2026-10-30 23:03:59',NULL),(2,'SUP-00002','Supreme Dairy & Poultry Co.','Suresh Kumar','+91 98200 22334',NULL,'distribution@supremedairy.com','Dairy Complex Road, Kanchipuram Highway','Central City','Tamil Nadu','600095','GSTIN33AABCS8901N1Z2','Daily supplier for milk, cheese, and farm eggs',1,'2026-10-30 23:03:59','2026-10-30 23:03:59',NULL),(3,'SUP-00003','Golden Harvest Bakery Supply','Vikram Joshi','+91 98300 33445','+91 44 2490 8877','sales@goldenharvest.com','SIDCO Industrial Estate, Ambattur','North City','Tamil Nadu','600058','GSTIN33AABCG2345P1Z4','Packaged bakery goods, bread, and baking ingredients',1,'2026-10-30 23:03:59','2026-10-30 23:03:59',NULL),(4,'SUP-00004','Everest Beverages & Snacks Ltd.','Deepak Verma','+91 98500 55667',NULL,'deepak@everestbev.com','78, Ring Road Logistics Hub','Metro Center','Tamil Nadu','600099','GSTIN33AABCE1234R1Z8','Former cold beverage vendor (Deactivated)',0,'2026-10-30 23:03:59','2026-10-30 23:03:59',NULL);
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sync_transactions`
--

DROP TABLE IF EXISTS `sync_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sync_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `idempotency_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `operation_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint unsigned DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `status` enum('success','conflict','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `resolution_notes` text COLLATE utf8mb4_unicode_ci,
  `client_timestamp` timestamp NULL DEFAULT NULL,
  `synced_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sync_transactions_idempotency_key_unique` (`idempotency_key`),
  KEY `sync_transactions_user_id_foreign` (`user_id`),
  KEY `sync_transactions_idempotency_key_index` (`idempotency_key`),
  KEY `sync_transactions_branch_id_status_index` (`branch_id`,`status`),
  CONSTRAINT `sync_transactions_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sync_transactions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sync_transactions`
--

LOCK TABLES `sync_transactions` WRITE;
/*!40000 ALTER TABLE `sync_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sync_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_slabs`
--

DROP TABLE IF EXISTS `tax_slabs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_slabs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rate` decimal(5,2) NOT NULL,
  `cgst_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `sgst_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `igst_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_slabs`
--

LOCK TABLES `tax_slabs` WRITE;
/*!40000 ALTER TABLE `tax_slabs` DISABLE KEYS */;
INSERT INTO `tax_slabs` VALUES (1,'GST 0%',0.00,0.00,0.00,0.00,1,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(2,'GST 5%',5.00,2.50,2.50,5.00,1,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(3,'GST 12%',12.00,6.00,6.00,12.00,1,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(4,'GST 18%',18.00,9.00,9.00,18.00,1,'2026-10-30 23:03:56','2026-10-30 23:03:56'),(5,'GST 28%',28.00,14.00,14.00,28.00,1,'2026-10-30 23:03:56','2026-10-30 23:03:56');
/*!40000 ALTER TABLE `tax_slabs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `units`
--

DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `units` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allow_decimals` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `units_short_code_unique` (`short_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `units`
--

LOCK TABLES `units` WRITE;
/*!40000 ALTER TABLE `units` DISABLE KEYS */;
INSERT INTO `units` VALUES (1,'Pieces','pcs',0,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(2,'Kilogram','kg',1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(3,'Gram','gm',1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(4,'Litre','ltr',1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(5,'Millilitre','ml',1,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(6,'Pack','pk',0,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(7,'Box','box',0,'2026-10-30 23:03:58','2026-10-30 23:03:58');
/*!40000 ALTER TABLE `units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_branch_roles`
--

DROP TABLE IF EXISTS `user_branch_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_branch_roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_branch_role` (`user_id`,`branch_id`,`role_id`),
  KEY `user_branch_roles_branch_id_foreign` (`branch_id`),
  KEY `user_branch_roles_role_id_foreign` (`role_id`),
  KEY `user_branch_roles_user_id_branch_id_index` (`user_id`,`branch_id`),
  CONSTRAINT `user_branch_roles_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_branch_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_branch_roles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_branch_roles`
--

LOCK TABLES `user_branch_roles` WRITE;
/*!40000 ALTER TABLE `user_branch_roles` DISABLE KEYS */;
INSERT INTO `user_branch_roles` VALUES (1,2,1,2,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(2,3,1,3,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(3,3,2,3,'2026-10-30 23:03:58','2026-10-30 23:03:58');
/*!40000 ALTER TABLE `user_branch_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pin_code` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_super_admin` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin User','admin@greenmart.pos',NULL,'$2y$12$C./Bk1BNGISZxQRIZaeiOev3uN1g9uExXpiOY8ftuz6hDtd6F1Viq','$2y$12$69VJV6iboyH6knEhdFRhAOm7SXFH/Ld8coNoiMov1/liRfto5Pham',1,1,'2026-10-31 01:36:39',NULL,'2026-10-30 23:03:57','2026-10-31 01:36:39'),(2,'Ramesh Manager','manager@greenmart.pos',NULL,'$2y$12$XEzlkVAOuwtoQD6g3aw4sOp7SwPuXtI2m2Dip/5Nvw7fAoUePt4LG','$2y$12$y.BV20/p4acJ7Eg195Sjje933jjxSH8f67zHdgiAseWEtyGd.5kKW',0,1,NULL,NULL,'2026-10-30 23:03:58','2026-10-30 23:03:58'),(3,'Priya Cashier','cashier@greenmart.pos',NULL,'$2y$12$xS7f1c8wq81SG733zX9Ni.hAQ/8nzvWCZcLXNUmzH6PxmeamW8NO2','$2y$12$nXUlN5exCKHSLHcpnXC44u3Z0L/sbXhKek/QJJnIaldO.lh2msDgi',0,1,NULL,NULL,'2026-10-30 23:03:58','2026-10-30 23:03:58');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-02 11:41:04
