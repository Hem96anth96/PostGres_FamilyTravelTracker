import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "Postgres",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function checkVisisted(currentUserId) {
  const result = await db.query(
    "SELECT * FROM user_visited_countries where user_id = $1",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getUsers() {
  const result = await db.query("SELECT * FROM public.users");
  let users = result.rows;
  return users;
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted(currentUserId);
  const users = await getUsers();
  let currentUser;
  
  users.forEach((user) => {

    if (user.user_id== currentUserId){
       currentUser = user;
    }
  })


  console.log(users);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.colour,
    currentUser: currentUser.user_name
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;

    const countries = await checkVisisted(currentUserId);
    if (!countries.includes(countryCode)) {
      await db.query(
        "INSERT INTO user_visited_countries (country_code, user_id ) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } else {
      res.status(400).send(`country '${input}' already added`);
    }
  } catch (err) {
    res.status(400).send(`country '${input}' does not exist`);
  }
});

app.post("/user", async (req, res) => {

  if(req.body.add ===  'new'){
  res.render("new.ejs");
  }else{

   const userid = req.body.user;
   currentUserId = userid;

  res.redirect("/");
}
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html

  let words = req.body.name.toLowerCase().split(' ');

  // Capitalize the first letter of each word
  for (let i = 0; i < words.length; i++) {
      words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
  }

  // Join the words back into a single string and return
  let formattedName = words.join(' ');

  await db.query("INSERT INTO users (user_name, colour ) VALUES ($1, $2)", [
    formattedName,
    req.body.color,
  ]);
  
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
