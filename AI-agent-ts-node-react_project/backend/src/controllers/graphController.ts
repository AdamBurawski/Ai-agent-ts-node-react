import { Request, Response } from "express";
import { BaseController } from "../types/controller";
import neo4j from "neo4j-driver";
import { importUsersAndConnections } from "../utils/neo4jUtils";
import path from "path";
import fs from "fs";

const uri = "bolt://localhost:7687";
const user = "neo4j";
const password = "pass1234";

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export class ImportDataController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    const session = driver.session();
    try {
      await session.executeWrite(async (tx) => {
        // Najpierw wyczyść istniejące dane
        await tx.run('MATCH (n) DETACH DELETE n');
        
        // Wczytaj dane z plików
        const usersPath = path.join(__dirname, '../../uploads/users.json');
        const connectionsPath = path.join(__dirname, '../../uploads/connections.json');
        
        const usersData = JSON.parse(await fs.promises.readFile(usersPath, 'utf-8'));
        const connectionsData = JSON.parse(await fs.promises.readFile(connectionsPath, 'utf-8'));

        const users = usersData.reply;
        const connections = connectionsData.reply;

        // Dodajmy logowanie aby zobaczyć strukturę danych
        console.log('Users data:', users);
        console.log('Connections data:', connections);

        // Utwórz węzły użytkowników
        for (const user of users) {
          await tx.run(
            'CREATE (u:User {id: $id, username: $username, access_level: $access_level, is_active: $is_active, lastlog: $lastlog})',
            { 
              id: user.id,
              username: user.username,
              access_level: user.access_level,
              is_active: user.is_active,
              lastlog: user.lastlog
            }
          );
        }

        // Utwórz połączenia między użytkownikami
        for (const conn of connections) {
          await tx.run(
            'MATCH (u1:User {id: $from}), (u2:User {id: $to}) ' +
            'CREATE (u1)-[:KNOWS]->(u2)',
            { 
              from: conn.user1_id,
              to: conn.user2_id
            }
          );
        }
      });

      res.status(200).json({ message: "Graph successfully created in Neo4j!" });
    } catch (error) {
      console.error("Error importing data:", error);
      res.status(500).json({ error: "Failed to create graph." });
    } finally {
      await session.close();
    }
  }
}

export class GetConnectionsController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    const session = driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        const response = await tx.run(`
          MATCH (u1:User)-[:KNOWS]->(u2:User)
          RETURN u1.username AS source, u2.username AS target
        `);
        return response.records.map((record) => ({
          source: record.get("source"),
          target: record.get("target"),
        }));
      });

      res.status(200).json({ connections: result });
    } catch (error) {
      console.error("Error fetching connections:", error);
      res.status(500).json({ error: "Failed to fetch connections." });
    } finally {
      await session.close();
    }
  }
}

export class ShortestPathController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    const { from, to } = req.body;
    const session = driver.session();

    if (!from || !to) {
      res.status(400).json({ 
        error: "Both 'from' and 'to' parameters are required",
        example: "{ 'from': 'UserName1', 'to': 'UserName2' }"
      });
      return;
    }

    try {
      const result = await session.executeRead(async (tx) => {
        const response = await tx.run(
          `
          MATCH p = shortestPath((a:User {username: $from})-[:KNOWS*]-(b:User {username: $to}))
          RETURN [node in nodes(p) | node.username] as path
          `,
          { from, to }
        );
        
        if (response.records.length === 0) {
          return null;
        }

        return response.records[0].get("path");
      });

      if (result === null) {
        res.status(404).json({ 
          error: `No path found between users '${from}' and '${to}'`
        });
        return;
      }

      res.status(200).json({ 
        success: true,
        path: result,
        message: `Found path from '${from}' to '${to}'`
      });

    } catch (error) {
      console.error("Error finding shortest path:", error);
      res.status(500).json({ 
        error: "Failed to find shortest path",
        details: error.message
      });
    } finally {
      await session.close();
    }
  }
}
