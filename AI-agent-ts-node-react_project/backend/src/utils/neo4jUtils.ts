import neo4j from "neo4j-driver";
import fs from "fs";

const uri = "bolt://localhost:7687"; // Adres Neo4j
const user = "neo4j"; // Domyślny użytkownik Neo4j
const password = "pass1234"; // Zmień na swoje hasło

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
const session = driver.session();

interface User {
  id: string;
  username: string;
  access_level: string;
  is_active: string;
  lastlog: string;
}

interface Connection {
  user1_id: string;
  user2_id: string;
}

// Funkcja do odczytu plików JSON
const readJsonFile = (filePath: string): any => {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

export const importUsersAndConnections = async () => {
  const users: User[] = readJsonFile(
    "/Volumes/Samsung HD/AI/AI-APP-PROJECT/AI_Devs_3-Quests/S05E01(Agent)/backend/uploads/connections.json"
  ).reply;
  const connections: Connection[] = readJsonFile(
    "/Volumes/Samsung HD/AI/AI-APP-PROJECT/AI_Devs_3-Quests/S05E01(Agent)/backend/uploads/connections.json"
  ).reply;

  try {
    // Importowanie użytkowników
    for (const user of users) {
      await session.run(
        `
        MERGE (u:User {id: $id})
        SET u.username = $username,
            u.access_level = $access_level,
            u.is_active = $is_active,
            u.lastlog = $lastlog
        `,
        {
          id: user.id,
          username: user.username,
          access_level: user.access_level,
          is_active: user.is_active,
          lastlog: user.lastlog,
        }
      );
    }

    // Importowanie relacji między użytkownikami
    for (const connection of connections) {
      await session.run(
        `
        MATCH (u1:User {id: $user1_id}), (u2:User {id: $user2_id})
        MERGE (u1)-[:KNOWS]->(u2)
        `,
        { user1_id: connection.user1_id, user2_id: connection.user2_id }
      );
    }

    console.log("Users and connections successfully imported!");
  } catch (error: any) {
    console.error("Error importing users and connections:", error.message);
    console.error("Stack trace:", error.stack);
  } finally {
    await session.close();
    await driver.close();
  }
};
