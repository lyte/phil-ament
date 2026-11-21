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

Everything you type is stored in `./data/phil-ament.db` on the host. Copy the `data` folder somewhere safe if you want a backup. Stop the container first so the file is not half-written:

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
