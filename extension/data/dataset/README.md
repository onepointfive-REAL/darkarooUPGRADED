# Dataset

This directory contains datasets of website information in different formats:

## Files

### data.json
The main dataset containing website information including:
- URL - website link
- Title
- Description
- Slogan - a short one-liner describing the website
- Icon ID (data/dataset/icons)
- Accent Color - in HSL format for website theming (most common color in logo)

### dirty_data.json
Raw/unprocessed website data including:
- Original scraped data
- Enhanced/cleaned data (through A.I.)
- Icon file paths
- HTTP status codes

### scraping/websites.txt
The original list of websites scraped
Note: only 50% of them were scraped successfully.

### scraping/main.js
Script used for gathering `dirty_data.json`

### scraping/cleaner.js
Script used to turn `dirty_data.json` to `data.json`

## Data Format

Example entry from data.json:
```json
{
    "url": "https://www.google.com",
    "title": "Google - Search Engine", 
    "description": "Discover the world's information with Google. Search, explore, and find what you need instantly.",
    "slogan": "Search on: Empowering your world",
    "iconID": "8ffdefbdec956b595d257f0aaeefd623",
    "accentColor": "hsl(217, 89%, 61%)"
}
```
