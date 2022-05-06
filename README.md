# sysstat-web (Alhpa)
lightweight Systemstatistics with Web preview. Compatible with munin plugins.

# Installation
Download project
```bash
git clone https://github.com/comlog-gmbh/sysstat-web.git
```
Initialize config
```bash
php /var/www/sysstat-web/run.php init
```
Add the command "php /var/www/sysstat-web/run.php" to cronjobs or windows task. Set the interval as you need it!


# Usage
## Start nodejs server
```bash
node server.js
````
## Start golang server
```bash
go run server.go
````

## Using nginx server
```
server {
	server_name sysstat.example.com;

	listen   80;
	listen   [::]:80;

	root /var/www/sysstat-web/httpdocs;
	index index.html;
	charset utf-8;
}
```


## Initialize plugins
Config file will be created in httpdocs/db/config.json
```bash
php run.php init
````

## Update data
Data files will be created in httpdocs/db/*.db. 
Format ist simple text file per day.
```bash
php run.php
````