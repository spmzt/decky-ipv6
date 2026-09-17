# Decky IPv6

A [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin to control IPv6 on the Steam Deck from the Quick Access Menu.

SteamOS disables IPv6 by default and reverts the setting on every update.

## Features

- Choose an IPv6 mode without leaving Game Mode:
  - **System default**: the plugin changes nothing.
  - **Enabled**: IPv6 is kept enabled.
  - **Disabled**: IPv6 is kept disabled.
  - **IPv6 only**: IPv6 is kept enabled and IPv4 is turned off on Wi-Fi and Ethernet.
- The selected mode persists across reboots and system updates.
- Shows the kernel IPv6 state and the Deck's global IPv6 and IPv4 addresses.
- Uninstalling the plugin restores system defaults.

## How it works

The selected mode is stored in the plugin's settings directory and re-applied when the plugin loads, whenever a device connects (watched with `nmcli monitor`) and every few seconds afterwards, since SteamOS updates and NetworkManager (on resume or when switching Wi-Fi networks) may revert it.

**Enabled** and **Disabled** write `/etc/sysctl.d/99-decky-ipv6.conf`, which sets `net.ipv6.conf.{all,default}.disable_ipv6` early at boot, and apply the same setting to every interface immediately.
Loopback (`lo`) always keeps IPv6 enabled so local services bound to `::1` keep working.

In **Enabled** and **IPv6 only**, saved NetworkManager connections may still have IPv6 disabled, which NetworkManager re-applies on every connect.
When a connected Wi-Fi or Ethernet device has no IPv6 link-local address, the plugin runs `nmcli device modify <device> ipv6.method auto`.

**IPv6 only** additionally runs `nmcli device modify <device> ipv4.method disabled` on those devices.

`nmcli device modify` only changes the active connection, not the saved NetworkManager profile, and is reverted with `nmcli device reapply` when leaving **IPv6 only** or switching to **System default**.
Reaching IPv4-only services in this mode requires NAT64/DNS64 on the network, and DNS servers must be provided over IPv6 (RA RDNSS or DHCPv6).

**System default** removes the sysctl config, resets `disable_ipv6` to the kernel default and reloads the system's own configuration with `sysctl --system`.

The plugin requires the `root` flag to change these settings.

## Development

### Dependencies

- Node.js v16.14+
- `pnpm` v9 (`sudo npm i -g pnpm@9`)

### Build

```bash
pnpm i
pnpm run build
```

The frontend is built into `dist/index.js`. The backend is `main.py` and needs no build step.

### Deploy to a Steam Deck

On the Deck (Desktop Mode, Konsole), set a password for `deck` if you have not already and enable SSH:

```bash
passwd
sudo systemctl enable --now sshd
```

From your development machine:

```bash
DECK=deck@steamdeck.local
rsync -av --delete --mkpath dist main.py plugin.json package.json LICENSE README.md "$DECK:/tmp/decky-ipv6/"
ssh -t "$DECK" 'sudo rm -rf ~/homebrew/plugins/decky-ipv6 &&
  sudo cp -r /tmp/decky-ipv6 ~/homebrew/plugins/decky-ipv6 &&
  sudo systemctl restart plugin_loader'
```

Backend logs are written to `~/homebrew/logs/decky-ipv6/`, and loader output is available with `journalctl -u plugin_loader -f`.

## License

BSD 3-Clause, see [LICENSE](LICENSE). Based on the [Decky plugin template](https://github.com/SteamDeckHomebrew/decky-plugin-template).
