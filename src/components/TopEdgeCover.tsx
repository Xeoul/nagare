// A solid bar along the top edge of the screen, in the page colour. On iOS 26
// it stops the system's edge blur from smearing the top of the page; elsewhere
// it's hidden. See .top-edge-cover in globals.css.
export default function TopEdgeCover() {
  return <div aria-hidden className="top-edge-cover" />;
}
