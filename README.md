# a-7cd

Browserbasierter MapleStory-inspirierter 2D-Sidescroller mit Node.js/WebSocket-Server.

## Starten

```bash
npm install
npm start
```

Dann im Browser öffnen: **http://localhost:3000**

Mehrere Browser-Tabs/Geräte im selben Netzwerk = Multiplayer (Server-IP statt localhost verwenden).

## Steuerung

- **Pfeiltasten / A,D** – Bewegen, **Pfeil hoch / Leertaste** – Springen
- **Q** – Normalangriff
- **W / E / R** – Skill 1 / 2 / 3 (abhängig vom Job)
- **I** – Inventar
- **J** – Job wählen (ab Level 3)
- **Enter** – Chat öffnen/senden

## Inhalt (aktueller Stand)

- 3 Maps mit Portalen: Henesys Field → Kerning Forest → Sleepywood Dungeon
- 4 Jobs (ab Level 3 wählbar): Warrior, Bowmaster, Thief, Priest – je 3 Skills
- 6 Mob-Typen mit einfacher KI (Wandern / Aggro-Chase), Respawn-Timer
- Inventar, Equipment (Waffe/Rüstung), Loot-Tabellen pro Mob
- Leveling mit EXP-Kurve, HP/MP-Wachstum
- Server-autoritative Physik (Gravity, Plattform-Kollision, one-way Plattformen)
- Chat pro Map

## Architektur

```
server/
  index.js          Game-Loop, WebSocket-Handling, Nachrichten-Router
  game/Player.js     Spielerzustand, Leveling, Inventory
  game/Mob.js        Mob-KI, Respawn
  game/Job.js        Job-/Skill-Definitionen
  game/Items.js       Items, Loot-Tabellen, Shop
  game/Physics.js     Gravity + Plattform-Kollision
  maps/maps.js        Map-Layouts, Portale, Mob-Spawns
public/
  index.html          UI-Grundgerüst (HUD, Skillbar, Panels, Chat)
  client.js           Networking, Canvas-Rendering, Input
  style.css           Styling
```

## Nächste Schritte (Ideen)

- Echte Sprites statt Farbrechtecke (PIL-generierte Assets wie bei deinem no-food Projekt)
- NPC-Händler als klickbare Figur statt reinem Panel
- Party-System, Trade zwischen Spielern
- Mehr Maps/Mobs, Boss-Fight
- Persistenz (aktuell: alles im RAM, Reset bei Server-Neustart)
