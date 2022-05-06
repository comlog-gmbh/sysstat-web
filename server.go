package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

var port = 8000

func htdocs() string {
	path, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}
	htdocs := path + "/httpdocs"
	if _, err := os.Stat(htdocs); os.IsNotExist(err) {
		path, err := os.Executable()
		if err != nil {
			log.Fatal(err)
		}
		path = filepath.Dir(path)
		htdocs2 := path + "/httpdocs"
		if _, err := os.Stat(htdocs); os.IsNotExist(err) {
			panic(fmt.Errorf("Folder '%s' and '%s' not found", htdocs, htdocs2))
		} else {
			return htdocs2
		}
	} else {
		return htdocs
	}
}

func main() {
	fs := http.FileServer(http.Dir(htdocs()))
	http.Handle("/", fs)

	log.Printf("Listening on :%d...\n", port)
	err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil)
	if err != nil {
		log.Fatal(err)
	}
}
