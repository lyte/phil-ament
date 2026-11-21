# Install Phil-ament

Phil-ament is one container. It listens on port 3000 inside the container. The compose file below publishes that as port 7720 on your computer, NAS, or Pi. The database is a file in the `data` folder, which is mounted into the container at `/data`.

```yaml
services:
  phil-ament:
    image: ghcr.io/lyte/phil-ament:latest
    container_name: phil-ament
    ports:
      - "7720:3000"
    volumes:
      - ./data:/data
    environment:
      - TZ=America/Edmonton
    restart: unless-stopped
```

Change `TZ` to your own timezone if you want. If 7720 is already in use, change the left-hand number in `ports:` to any free port. Leave `3000` as it is. That is the port inside the container.

The image is built for 64-bit Intel/AMD (`linux/amd64`) and 64-bit ARM (`linux/arm64`), which covers a typical PC, a Synology, and a Raspberry Pi 4 or 5 running a 64-bit OS.

CasaOS is different. Do not paste the file above into CasaOS. Use the [CasaOS](#casaos) section and `docker-compose.casaos.yml`.

## Synology Container Manager

These steps match Container Manager on DSM 7.2.

1. Open **Package Center**, search for **Container Manager**, and install it.
2. Open **File Station**. Create a folder for the app, for example `docker/phil-ament` on one of your shared folders.
3. Inside that folder, create a folder named `data`. This is where the inventory database will live. Do not put anything else important in it, and do not delete it when you update.
4. In the `phil-ament` folder (next to `data`, not inside it), create a text file named `docker-compose.yml`. Paste the compose file from the top of this page. In File Station you can do this with **Create** → **Create text file**, or by uploading a file you saved on your computer.
5. Open **Container Manager**.
6. Go to **Project**, then **Create**.
7. Project name: `phil-ament`.
8. Path: select the `phil-ament` folder that contains `docker-compose.yml`.
9. Source: use the existing compose file. The page should show the same services, ports, and volume as the file. Leave them as they are.
10. Click through **Next** and start the project. Container Manager pulls `ghcr.io/lyte/phil-ament:latest` and starts it. The first start can take a minute while it downloads the image and builds the filament catalog.
11. When the project status is **Running**, open a browser on your phone or computer to `http://<nas-ip>:7720`. The NAS IP is shown in DSM under **Control Panel** → **Info Center**, or in the address bar you already use for DSM.

If the page does not load, check that port 7720 is free and that the DSM firewall allows it. You can change the left-hand port in the compose file (for example `"8081:3000"`) and create the project again.

### Update on a Synology

From a Mac, Windows, or Linux machine, you can open an SSH session to the NAS (SSH has to be enabled in **Control Panel** → **Terminal & SNMP**) and run:

```bash
cd /volume1/docker/phil-ament
sudo docker compose pull && sudo docker compose up -d
```

`/volume1/docker/phil-ament` is the usual path. If your folder lives on a different volume, use that path instead. The `data` folder is not touched.

In Container Manager you can also open the project and build it again after editing the compose file. Pulling from SSH is the reliable way to get a newer `latest` image.

## CasaOS

Phil-ament is not in the CasaOS app store. You add it with **Custom Install**. Use [`docker-compose.casaos.yml`](../docker-compose.casaos.yml), not the compose file at the top of this page. The CasaOS file already names the web page, the port, and the folder for the database, so the import form is filled in for you.

That file is safe to ignore on any other Docker host. The extra `x-casaos` blocks are notes for CasaOS. Docker Compose does not use them when it starts the container. Synology Container Manager and Portainer do the same.

1. Open CasaOS in a browser.
2. Open **App Store**.
3. Open **Custom Install**.
4. Click **Import**.
5. Paste the compose file below. It is the same as `docker-compose.casaos.yml` in the repository. Click **Submit**.
6. CasaOS opens a form and asks you to check a few fields. They should already be filled in:
   - Web UI port **7720**, path **/**
   - Mount: host `/DATA/AppData/phil-ament`, container `/data`
   - Port mapping: host **7720** to container **3000**
7. Click through and install. The first start downloads the image. When the app is running, open `http://<casaos-ip>:7720`. The address of CasaOS is the same one you already use, with port 7720 instead of the CasaOS port.

CasaOS always shows that form, even when the compose file filled it in. Read the values. If they match the list above, you do not need to type anything.

If you pasted the other compose file, or a box is empty, type the values yourself:

- Web UI port: `7720`. Path: `/`.
- Mount location: host path `/DATA/AppData/phil-ament`, container path `/data`. This is the CasaOS place for app data. The inventory database is the file `phil-ament.db` inside that folder.
- Port mapping: host port `7720`, container port `3000`. Leave `3000` as it is.
- If there is a `TZ` line, set it to your time zone. `America/Edmonton` is only an example.

The icon on the CasaOS home screen comes from GitHub (`static/icons/icon-512.png`). This repository is private, so CasaOS cannot download that picture yet and the icon may be blank. The app still runs. The icon works once the repository is public.

If CasaOS cannot download the image, the package on GHCR may still be private. The note in [If the container will not start](#if-the-container-will-not-start) covers that. On the CasaOS machine, `docker login ghcr.io` with a token that can read packages lets the install pull `ghcr.io/lyte/phil-ament`.

```yaml
name: phil-ament
services:
  phil-ament:
    image: ghcr.io/lyte/phil-ament:latest
    container_name: phil-ament
    ports:
      - target: 3000
        published: "7720"
        protocol: tcp
    volumes:
      - type: bind
        source: /DATA/AppData/phil-ament
        target: /data
    environment:
      - TZ=America/Edmonton
    restart: unless-stopped
    x-casaos:
      envs:
        - container: TZ
          description:
            en_US: Time zone, for example America/Edmonton.
      ports:
        - container: "3000"
          description:
            en_US: Web UI. Published on the host as port 7720.
      volumes:
        - container: /data
          description:
            en_US: Inventory database. Stored on the host at /DATA/AppData/phil-ament.
x-casaos:
  architectures:
    - amd64
    - arm64
  main: phil-ament
  author: futuristicvlad
  developer: futuristicvlad
  category: Utilities
  title:
    en_US: Phil-ament
  tagline:
    en_US: Phil-ament
  description:
    en_US: Self-hosted filament inventory for 3D printing
  icon: https://raw.githubusercontent.com/lyte/phil-ament/main/static/icons/icon-512.png
  port_map: "7720"
  index: /
  scheme: http
```

### Update on CasaOS

The database stays in `/DATA/AppData/phil-ament`. Do not delete that folder.

CasaOS keeps its own copy of the compose file after import. From a terminal on the CasaOS machine:

```bash
docker pull ghcr.io/lyte/phil-ament:latest
```

Then restart Phil-ament from the CasaOS app screen. Pulling a new image does not replace `/DATA/AppData/phil-ament`.

## Raspberry Pi

Use **Raspberry Pi OS (64-bit)**. The 32-bit OS will not run this image.

1. Update the Pi and install Docker:

   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

2. Log out and back in (or reboot) so the group change applies. Check with `docker version`. You want the line that says the server is running, and a Compose plugin (`docker compose version`).
3. Create the app folder and the compose file:

   ```bash
   mkdir -p ~/phil-ament/data
   cd ~/phil-ament
   nano docker-compose.yml
   ```

   Paste the compose file from the top of this page, save, and exit (`Ctrl+O`, Enter, `Ctrl+X` in nano).
4. Start it:

   ```bash
   docker compose up -d
   ```

5. Open `http://<pi-ip>:7720`. On many home networks that is `http://raspberrypi.local:7720`. Find the IP with `hostname -I` if the name does not resolve.

### Update on a Pi

```bash
cd ~/phil-ament
docker compose pull && docker compose up -d
```

## Any other computer with Docker

You need Docker Engine and the Compose v2 plugin (`docker compose`, with a space).

```bash
mkdir -p phil-ament/data
cd phil-ament
# save docker-compose.yml here
docker compose up -d
```

Open `http://localhost:7720` on that machine, or `http://<that-machine-ip>:7720` from your phone.

Update with:

```bash
docker compose pull && docker compose up -d
```

## Your data

Everything you type is stored in `./data/phil-ament.db` on the host. On CasaOS that file is `/DATA/AppData/phil-ament/phil-ament.db`. Copy the data folder somewhere safe if you want a backup. Stop the container first so the file is not half-written:

```bash
docker compose stop
# copy the data folder
docker compose start
```

Updating the container does not replace this folder.

## Optional login

Login is off when you first open the app. Turn it on in **Settings** if other people on the network should not be able to change the inventory. The password is stored as a hash in the database, not as the password itself.

Phil-ament is meant for a home network. If you expose it to the internet, turn login on and put it behind HTTPS.

### Forgot the password

Add this line under `environment` in `docker-compose.yml`:

```yaml
- PHILAMENT_RESET_AUTH=1
```

Then restart once:

```bash
docker compose up -d
```

Login is turned off and the password is cleared. Remove the `PHILAMENT_RESET_AUTH` line and restart again (`docker compose up -d`) so a later restart does not keep clearing it. You can turn login on again from Settings.

## If the container will not start

- `docker compose logs phil-ament` shows the latest output. A healthy start logs the database path.
- `docker ps` should list `phil-ament` as healthy after the first half minute. The image checks `http://127.0.0.1:3000/api/health`.
- If Docker says the image is not found or access is denied, the package on GHCR may still be private. On GitHub, open the package `phil-ament` and set its visibility to public, or run `docker login ghcr.io` with a token that can read packages.
- If the app starts and then complains it cannot write the database, the `data` folder is not writable by the container. On a NAS, that usually means the folder permissions. Create `data` yourself and, if needed, give it open write access (`chmod 777 data` is fine on a private home server).
