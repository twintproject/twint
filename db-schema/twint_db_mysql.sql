CREATE DATABASE  IF NOT EXISTS `twitterdata_v9` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;
USE `twitterdata_v9`;
-- MySQL dump 10.13  Distrib 5.7.22, for Linux (x86_64)
--
-- Host: localhost    Database: twitterdata_v9
-- ------------------------------------------------------
-- Server version	5.7.22-0ubuntu0.16.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `followers`
--

DROP TABLE IF EXISTS `followers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `followers` (
  `id` bigint(30) NOT NULL,
  `name` mediumtext,
  `username` text NOT NULL,
  `bio` longtext,
  `location` tinytext,
  `url` longtext,
  `join_date` tinytext NOT NULL,
  `join_time` tinytext NOT NULL,
  `tweets` int(11) DEFAULT NULL,
  `following` int(11) DEFAULT NULL,
  `followers` int(11) DEFAULT NULL,
  `likes` int(11) DEFAULT NULL,
  `media` int(11) DEFAULT NULL,
  `private` tinytext NOT NULL,
  `verified` tinytext NOT NULL,
  `avatar` longtext NOT NULL,
  `date_update` datetime NOT NULL,
  `follower` text NOT NULL,
  PRIMARY KEY (`follower`(255),`username`(255),`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `followers_names`
--

DROP TABLE IF EXISTS `followers_names`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `followers_names` (
  `user` text NOT NULL,
  `date_update` datetime NOT NULL,
  `follower` text NOT NULL,
  PRIMARY KEY (`user`(255),`follower`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `following`
--

DROP TABLE IF EXISTS `following`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `following` (
  `id` bigint(30) NOT NULL,
  `name` mediumtext,
  `username` text NOT NULL,
  `bio` longtext,
  `location` tinytext,
  `url` longtext,
  `join_date` tinytext NOT NULL,
  `join_time` tinytext NOT NULL,
  `tweets` int(11) DEFAULT NULL,
  `following` int(11) DEFAULT NULL,
  `followers` int(11) DEFAULT NULL,
  `likes` int(11) DEFAULT NULL,
  `media` int(11) DEFAULT NULL,
  `private` tinytext NOT NULL,
  `verified` tinytext NOT NULL,
  `avatar` longtext NOT NULL,
  `date_update` datetime NOT NULL,
  `follows` text NOT NULL,
  PRIMARY KEY (`id`,`username`(255),`follows`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `following_names`
--

DROP TABLE IF EXISTS `following_names`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `following_names` (
  `user` text NOT NULL,
  `date_update` datetime NOT NULL,
  `follows` text NOT NULL,
  PRIMARY KEY (`user`(255),`follows`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tweets`
--

DROP TABLE IF EXISTS `tweets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tweets` (
  `id` bigint(30) NOT NULL,
  `user_id` bigint(30) DEFAULT NULL,
  `date` date NOT NULL,
  `time` time NOT NULL,
  `timezone` tinytext NOT NULL,
  `location` tinytext NOT NULL,
  `user` text NOT NULL,
  `tweet` longtext NOT NULL,
  `replies` int(11) DEFAULT NULL,
  `likes` int(11) DEFAULT NULL,
  `retweets` int(11) DEFAULT NULL,
  `hashtags` longtext,
  `link` longtext,
  `retweet` int(1) DEFAULT NULL,
  `user_rt` text,
  `mentions` longtext,
  `date_update` datetime NOT NULL,
  `search_name` mediumtext NOT NULL COMMENT 'user can use this field to know from which search the info comes. max 255 chars. if the user do not especify, it must be set to "-" ',
  PRIMARY KEY (`id`,`search_name`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2018-06-03 14:52:08
