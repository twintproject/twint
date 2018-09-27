# Elasticsearch How-To

![dashboard](https://i.imgur.com/BEbtdo5.png)

### Zero Point
First of all you have to download two main tools:
- [Elasticsearch](https://www.elastic.co/downloads/elasticsearch);
- [Kibana](https://www.elastic.co/downloads/kibana).

Important notes:

   1. Elasticsearch requires at least Java 8, it is recommended to use the Oracle JDK version 1.8.0_131;
   2. Starting with version 6.0.0 Kibana only supports 64 bit operating systems, so if you are using earlier versions you should upgrade or just simply create the index **before** indexing data.

Elasticsearch is basically a search engine and Kibana is a tool for data visualization.
We will index some data to the first one and create a dashboard with the second one.

Now everything is ready to go.

### Initial setup
Since is Kibana that connects to Elasticsearch, let's run Elasticsearch first.

Expected Elasticsearch's output:
> [2018-03-30T17:32:46,525][INFO ][o.e.n.Node] [T7Twj0J] started

Expected Kibana's output:
>  log   [15:45:50.267] [info][status][plugin:elasticsearch@6.2.2] Status changed from yellow to green - Ready

If you are not getting these outputs I suggest you to dig in the corresponding documentation.

Now that everything is up and running:

1. Index some data: `python3.6 Twint.py --elasticsearch localhost:9200 -u user` (in this case `--elasticsearch` is mandatory argument and its value is a host:port combination, where the Elasticsearch instance is binding to);

2. Now we can create the index (that I already built): open your browser and go to `http://localhost:5601` (again, this is a default value), `Dev Tools` tab, copy&paste `index-tweets.json` and than click the green arrow. Expected output is 

```json
{
  "acknowledged": true,
  "shards_acknowledged": true,
  "index": "twinttweets"
}
```

3. Go to `Management` tab, `Index Patterns`, `Create Index Pattern`, `Index Pattern: twint` and choose `datestamp` as time field;

4. Go to the `Discover` tab, choose `twinttweets` and you should see something like this:

![1](https://i.imgur.com/Ut9173J.png)

PS: this screenshot has the index named `tweep`, you will see `twinttweets`

### Query How-to 
1. Filter out "multiplied" data and analyze only own tweets.
If, during the indexing phase, you specified the `--es-count` param you could have the need of filtering-out the counting of likes/retweets/replies, to achieve this in the `Search` bar type `NOT _exists_:likes NOT _exists_:retweets NOT _exists_:replies`;

2. Filter-out tweets for a specific username: `username: handle`, where `handle` is `@handle`;
3. Filter-out tweets for a specific user_id: `user_id: 0123456`;
4. Filter-out tweets for a specific word in the tweet: `tweet: osint`;
5. Define specific timestamp intervals: click on the clock in the top right corner;
6. Concatenate conditions: Lucene syntax has some logic built-in, operators like `AND` and `OR` are useful to restrict the data that you want to study;

[Here](https://www.elastic.co/guide/en/kibana/current/lucene-query.html) a short article about Lucene Query Syntax.

### Examples
Search for every tweet from "@John" and "@Janet":
`username: John AND username: Janet`

Search for tweets from "myearthquakeapp" and restrict the result for earthquakes with magnitude between 5.0 and 5.9:
`username: myearthquakeapp AND tweet: 5.?`

Search for tweets with at least 5 likes:
`nlikes: [5 TO *]` and similarly tweets with at least 1 like but less than 10 `nlikes: [1 TO 10]` (`[]` extremes included, `{}` extremes excluded)

### Ready-to-Use Visualizations
With the newest versions of Kibana users can export objects, for example, but not limited to, visualizations and dashboards. 

Making visualizations is a simple but not easy process, you have to combine how you want to index data and how you want to visualize it.

To help you getting started with Twint and Elasticsearch, I made some basic visualization and a dashboard. To use them you have just to import them: go to `Management` tab (the gear), `Saved Objects`, `Import` and then select `dashboard_visualizations.json`. 
After this just to go `Dashboard` tab and click on `Twint Dashboard`.

![2](https://i.imgur.com/iaH3s7z.png)
![3](https://i.imgur.com/hVeCrqL.png)
