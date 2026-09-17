import {
  DropdownItem,
  Field,
  PanelSection,
  PanelSectionRow,
  SingleDropdownOption,
  staticClasses
} from "@decky/ui";
import {
  callable,
  definePlugin,
  toaster
} from "@decky/api"
import { useEffect, useState } from "react";
import { FaNetworkWired } from "react-icons/fa";

type Mode = "enabled" | "disabled" | "ipv6_only" | null;

interface Address {
  interface: string;
  address: string;
  prefix: number;
}

interface Status {
  mode: Mode;
  ipv6_enabled: boolean;
  ipv6_addresses: Address[];
  ipv4_addresses: Address[];
}

const getStatus = callable<[], Status>("get_status");
const setMode = callable<[mode: Mode], Status>("set_mode");

// Dropdown option data must be non-null, so "system default" is mapped to null on the way out.
const SYSTEM_DEFAULT = "system";

const modeOptions: SingleDropdownOption[] = [
  { data: SYSTEM_DEFAULT, label: "System default" },
  { data: "enabled", label: "Enabled" },
  { data: "disabled", label: "Disabled" },
  { data: "ipv6_only", label: "IPv6 only" },
];

const modeDescriptions: Record<string, string> = {
  [SYSTEM_DEFAULT]: "The plugin does not change any network settings.",
  enabled: "IPv6 is kept enabled, even if SteamOS turns it off.",
  disabled: "IPv6 is kept disabled. Loopback (::1) stays enabled.",
  ipv6_only: "IPv4 is turned off on Wi-Fi and Ethernet. Requires NAT64/DNS64 on your network to reach IPv4-only services.",
};

function AddressRows({ title, addresses }: { title: string; addresses: Address[] }) {
  return (
    <PanelSection title={title}>
      {addresses.length ? (
        addresses.map((a) => (
          <PanelSectionRow key={`${a.interface}-${a.address}`}>
            <Field label={a.interface} description={`${a.address}/${a.prefix}`} focusable />
          </PanelSectionRow>
        ))
      ) : (
        <PanelSectionRow>
          <Field label="None" focusable />
        </PanelSectionRow>
      )}
    </PanelSection>
  );
}

function Content() {
  const [status, setStatus] = useState<Status | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const refresh = () => getStatus().then(setStatus);
    refresh();
    // Addresses change a few seconds after a mode switch (SLAAC/DHCP).
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  const onChange = async (option: SingleDropdownOption) => {
    const mode = option.data === SYSTEM_DEFAULT ? null : (option.data as Mode);
    setBusy(true);
    try {
      setStatus(await setMode(mode));
    } catch (e) {
      toaster.toast({ title: "IPv6", body: `Failed to change mode: ${e}` });
    } finally {
      setBusy(false);
    }
  };

  const selected = status === undefined ? undefined : (status.mode ?? SYSTEM_DEFAULT);

  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <DropdownItem
            label="IPv6 mode"
            description={selected === undefined ? undefined : modeDescriptions[selected]}
            rgOptions={modeOptions}
            selectedOption={selected}
            disabled={status === undefined || busy}
            onChange={onChange}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <Field label="Kernel IPv6" focusable>
            {status === undefined ? "…" : status.ipv6_enabled ? "Enabled" : "Disabled"}
          </Field>
        </PanelSectionRow>
      </PanelSection>
      <AddressRows title="IPv6 addresses" addresses={status?.ipv6_addresses ?? []} />
      <AddressRows title="IPv4 addresses" addresses={status?.ipv4_addresses ?? []} />
    </>
  );
};

export default definePlugin(() => {
  return {
    name: "IPv6",
    titleView: <div className={staticClasses.Title}>IPv6 Control</div>,
    content: <Content />,
    icon: <FaNetworkWired />,
    onDismount() {},
  };
});
