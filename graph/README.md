# Graph Visualization How-To

![graph](https://i.imgur.com/EEJqB8n.png)

Under `Graph` directory there is the source code of the `Twint OSINT Explorer`, the compiled version will be provided.

## Initial Setup
First of all you have to run a couple of commands:
1. `npm install`;
2. Now you should install `sqlite3` package, running `npm install sqlite3` might not work all the times so I compiled it and uploaded in `graph/sqlite3` so you don't have to get into troubles, everything you need to do is just to copy `sqlite3` in `node_modules` dir;
3. To start `Twint OSINT Explorer` just run `npm start .` 

## Descrption
On the left side there are: 

### Home
Does nothing (now as now).

### Dashboard
You will have to create a file `dashboard.txt` in that directory, that file will contain the url of the `iframe` object of the Kibana Dashboard... this does nothing more than using your browser to visualize the dashboard that you made in Kibana.

### Graph
You will **have to** have the database to visualize users in a pretty nice graph.

How to:
1. `Database file`: the name file of the database (e.g.: twint.db);
2. `Graph file`: **useless** (now as now);
3. Select the table: `Users`, `Followers` or `Following`;
4. `Condition` the value that you want to graph, in case of the Users table this will graph that specific user (you can use * to graph every user that you scraped, this might slow down), the same for Followers and Following tables... given a specific condition it will load users with that name (in case of users table), users that have the "condition-user" as follower (in case of followers table) and the same for following table;
5. `Load Settings`: this will prepare the connection between users, does not plot;
6. `Load Graph`: plots;
7. You can use `Raw Query` to execute raw queries (e.g.: `select column from table where.....`).

`Import Graph` and `Export Graph` are useless, I'm working on a way to achieve this.

**Attention here**: using * in condition might require a lot of time, I did the best to speed up, good luck.

## Run
If you don't build you can run `npm start .` and if you want to build you can run `npm run build` (you might change configs in `package.json` to build for your own system and arch).

## Dev
This feature and this Wiki is highly under development. The code and features might not be completed but everything works as expected and tested.
