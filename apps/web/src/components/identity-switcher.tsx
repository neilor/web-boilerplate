import { switchDemoIdentity } from '@/lib/actions';
import { DEMO_IDENTITIES, type DemoIdentity } from '@/lib/demo-identity';

/** Server-rendered form: works without JavaScript and never exposes the identity cookie to scripts. */
export function IdentitySwitcher({ current }: { current: DemoIdentity }) {
  return (
    <form action={switchDemoIdentity} className="identity">
      <label htmlFor="identity">Demo identity</label>
      <select id="identity" name="identity" defaultValue={current}>
        {Object.entries(DEMO_IDENTITIES).map(([key, identity]) => (
          <option key={key} value={key}>
            {identity.label}
          </option>
        ))}
      </select>
      <button type="submit" className="button button-secondary">
        Switch
      </button>
    </form>
  );
}
