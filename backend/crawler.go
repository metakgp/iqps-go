package main

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gocolly/colly"
)

func Crawl() string {

	sql_query := "INSERT INTO table (name, year, type) VALUES\n"

	c := colly.NewCollector(
		colly.AllowedDomains("10.18.24.75"),
		colly.CacheDir("./cache"),
		colly.MaxDepth(9),
		colly.Async(true),
	)

	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		link := e.Attr("href")
		url := e.Request.AbsoluteURL(link)
		var name string
		var year int
		var typ string

		if strings.Contains(url, ".pdf") {
			temp := strings.Split(url, "/")
			if len(temp) == 8 {
				name = temp[7]
				year, _ = strconv.Atoi(temp[4])
				typ = strings.ToLower(temp[5])
				i := strings.Index(typ, "mid")
				if i != -1 {
					typ = typ[i : i+3]
				} else {
					i = strings.Index(typ, "end")
					if i != -1 {
						typ = typ[i : i+3]
					} else {
						typ = ""
					}
				}
			} else {
				name = temp[6]
				year, _ = strconv.Atoi(temp[4])
				typ = ""
			}

			fmt.Println(name, year, typ)
			sql_query = sql_query + "("+name+", "+fmt.Sprint(year)+", "+typ+"),\n"
		}

		c.Visit(e.Request.AbsoluteURL(link))
	})

	c.Visit("http://10.18.24.75/peqp")
	c.Wait()

	return sql_query
}
