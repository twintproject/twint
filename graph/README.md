# Graph Visualization How-To

![graph](https://i.imgur.com/EEJqB8n.png)

Under `Graph` directory there is the source code of the `Twint OSINT Explorer`, the compiled version will be provided.

## Install
#### Dependencies
- NodeJS
- `libsqlite3-dev libxss1 libx11-xcb-dev libxtst-dev libgconf-2-4 libnss3 libasound-dev`

### Debian/Ubuntu Based Systems
```
chmod +x install.sh
./install.sh
```

### Docker
```
xhost local:root
docker run --name twint -v /tmp/.X11-unix:/tmp/.X11-unix -v $(PWD)/data:/data/data -e DISPLAY=unix$DISPLAY --rm c0dy/twint-explorer
```

### Other
Steps:
1. `Install node-sqlite3` - I recommend building this from source by doing the following:
```
git clone git clone https://github.com/mapbox/node-sqlite3.git
cd node-sqlite3
npm install --build-from-source
```
or you can run
```
npm install sqlite3
```
2. `npm install` - In this directory
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
