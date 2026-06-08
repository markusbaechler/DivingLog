# 🤿 DivingLog – Tauchlogbuch

Eine mobile-first Progressive Web App (PWA) zum Führen deines persönlichen
Tauchlogbuchs. Mit Supabase-Cloud-Datenbank, weltweiter Tauchkarte,
Statistiken, Import aus **Garmin Connect** und **DivingLog** sowie
**Excel-Export**.

## Funktionen

- 🔐 **Cloud-Speicherung** mit Supabase (Postgres + Auth, Row-Level-Security pro Nutzer)
- 📱 **Mobile-first Design** als installierbare PWA
- 🗺️ **Tauchkarte** (weltweit) auf Basis von OpenStreetMap/Leaflet
- 📊 **Statistiken** (Tauchgänge pro Jahr, Tiefenverteilung, Top-Tauchplätze u. v. m.)
- 📈 **Tauchprofil-Diagramme** (Tiefe/Temperatur über Zeit)
- ⌚ **Garmin-Import** aus FIT-Dateien (inkl. GPS und Profil)
- 📄 **DivingLog-Import** über das UDDF-Format (XML)
- 📥 **Excel-Export** des gesamten Logbuchs inkl. Statistikblatt

## Tech-Stack

- [Next.js 15](https://nextjs.org/) (App Router) · React 18 · TypeScript
- [Supabase](https://supabase.com/) (Auth + Postgres)
- [Tailwind CSS](https://tailwindcss.com/) (mobile-first)
- [Leaflet](https://leafletjs.com/) für die Karte
- [Recharts](https://recharts.org/) für Diagramme
- [ExcelJS](https://github.com/exceljs/exceljs) für den Excel-Export
- `fit-file-parser` (Garmin) und `fast-xml-parser` (UDDF)

## Schnellstart

### 1. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com/) ein kostenloses Projekt erstellen.
2. Im **SQL-Editor** nacheinander ausführen:
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) – Tabellen, Trigger und Row-Level-Security-Policies.
   - [`supabase/migrations/0002_rich_dive_fields.sql`](supabase/migrations/0002_rich_dive_fields.sql) – zusätzliche Tauchgang-Felder (Garmin-Datenmodell: Gas, Tanks, Deko, Puls, GPS …).
3. Unter **Settings → API** die `Project URL` und den `anon public`-Key kopieren.

> Optional: In **Authentication → Providers → Email** kannst du die
> E-Mail-Bestätigung deaktivieren, um lokal schneller testen zu können.

### 2. Umgebungsvariablen setzen

```bash
cp .env.local.example .env.local
```

Dann `.env.local` mit deinen Supabase-Werten füllen:

```
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
```

### 3. Abhängigkeiten installieren & starten

```bash
npm install
npm run dev
```

Die App läuft anschließend auf [http://localhost:3000](http://localhost:3000).

## Import-Formate

| Quelle      | Format        | Hinweise                                                        |
| ----------- | ------------- | -------------------------------------------------------------- |
| Garmin      | `.fit`        | In Garmin Connect die Aktivität als „Originaldatei" exportieren |
| DivingLog   | `.uddf` / XML | In DivingLog über Datei → Exportieren → UDDF                    |

Importe werden anhand einer externen ID dedupliziert – ein erneuter Import
derselben Datei erzeugt keine Duplikate.

## Projektstruktur

```
src/
  app/
    (app)/            # Authentifizierter Bereich (Layout mit Navigation)
      page.tsx        # Dashboard
      dives/          # Liste, Detail, Erstellen, Bearbeiten
      map/            # Weltweite Tauchkarte
      statistics/     # Statistiken & Diagramme
      import-export/  # Import (Garmin/DivingLog) & Excel-Export
      profile/        # Nutzerprofil
    api/
      import/garmin/  # FIT-Import
      import/uddf/    # UDDF-Import
      export/excel/   # Excel-Export
    login/            # Anmeldung/Registrierung
    auth/callback/    # E-Mail-Bestätigung
  components/         # UI-Komponenten (Karte, Formulare, Diagramme …)
  lib/
    supabase/         # Supabase-Clients (Browser/Server/Middleware)
    import/           # Parser (garmin, divinglog) + Persistenz
    export/           # Excel-Erzeugung
    stats.ts          # Statistik-Berechnung
supabase/migrations/  # SQL-Schema
```

## Deployment

Empfohlen: [Vercel](https://vercel.com/). Repository verbinden, die beiden
Umgebungsvariablen hinterlegen und deployen. Die PWA ist danach auf dem
Smartphone über „Zum Startbildschirm hinzufügen" installierbar.

## Lizenz

Privat / persönlich.
