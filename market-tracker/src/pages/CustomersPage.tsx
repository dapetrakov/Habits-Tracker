import { items } from '../data';
import { ItemList } from '../components/ItemCard';
import { REGIONS } from '../lib/schema';

export function CustomersPage() {
  const list = items.filter((i) => i.type === 'Customer' || i.type === 'Licensing round');
  return (
    <>
      <h1>Customers &amp; licensing rounds</h1>
      <nav className="jump">
        {REGIONS.map((r) => (
          <a key={r} href={`#/customers`} onClick={(e) => { e.preventDefault(); document.getElementById(r)?.scrollIntoView({ behavior: 'smooth' }); }}>
            {r} ({list.filter((i) => i.region === r).length})
          </a>
        ))}
      </nav>
      {REGIONS.map((r) => (
        <section key={r} id={r} className="region">
          <h2>{r}</h2>
          <ItemList items={list.filter((i) => i.region === r)} empty={`No ${r} items yet.`} />
        </section>
      ))}
    </>
  );
}
