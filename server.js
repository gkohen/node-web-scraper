'use strict';

var express = require('express');
var _ = require('lodash');
var request = require('request');
var Promise = require('bluebird');
var rp = require('request-promise-any')
var cheerio = require('cheerio');
var app = express();
var port = process.env["app_port"] | 8080;
var app_host = process.env.app_host || '127.0.0.1';
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');


app.get('/', function (req, res) {
    // Let's scrape Anchorman 2
    url = 'http://bms.westfordk12.us/pages/teams/7/7%20BMS%20homework/0005FD48-80000001/';

    request(url, function (error, response, html) {
        if (!error) {
            var homeworkEntries = [];

            var entries = getLinks(html, url);
            Promise.all(getArticles(entries)).then(function(resolvedEntries){

                renderResponse(res, groupArticles(resolvedEntries));
            });

            return;
        }
    })

    function groupArticles(ungroupedArticles) {
        var groupedArticles =  _(ungroupedArticles)
            .groupBy(entry => entry.date)
            .orderBy(entry => new Date(entry[0].date),'desc');
        console.log(groupedArticles.value());
        return groupedArticles.value();
    }

    function renderResponse(result, resolvedEntries){
        result.render('home', {resolvedEntries: resolvedEntries});
    }

    function getArticles(articles) {
        return articles.map(articleEntry => scrapeArticle(articleEntry) );
    }

    function scrapeArticle(entry) {
        return rp(entry.link).then(html => cheerio.load(html)('td.innerCent table[summary]'))
            .then(function (content) {
                content.find('img').remove();
                content.find('br').remove();
                var articleScraped = Object.assign({}, entry, {
                    content: content.html()
                });

                return articleScraped;
            }).catch(error => console.log('Error!!! ',error));
    }

    function getLinks(html, base) {
        var $ = cheerio.load(html),
            entries = [];
        console.log('scraping...');
        $('tr.folderRow>td:first-child>div>a').toArray().map(function (htmlEntry, index) {
            //     console.log(htmlEntry);
            var entry = {};
            entry.name = $(htmlEntry).text().replace(/[\d\-\/]/gi, '').trim();
            entry.link = base + $(htmlEntry).attr('href');
            entry.date = $($('tr.folderRow>td:nth-child(2)>div')[index]).text().replace('Updated: ','');
            entries.push(entry);
      //      console.log(entry);
        });
        return entries;
    }
})

app.listen(port)
console.log('Magic happens on port '+port);
exports = module.exports = app;
