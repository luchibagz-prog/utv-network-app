export default function UTVLoading() {
  return (
    <main className="utvRouteLoading" aria-label="Loading UTV">
      <div className="utvRouteLoadingTop">
        <img src="/utv-logo.png" alt="UTV" className="utvRouteLoadingLogo" />
        <div className="utvRouteLoadingBell" />
      </div>

      <section className="utvRouteLoadingBody">
        <div className="utvRouteLoadingPulse">
          <span />
          <strong>UTV</strong>
        </div>

        <div className="utvRouteSkeleton utvRouteSkeletonHero" />

        <div className="utvRouteSkeletonRow">
          <div className="utvRouteSkeleton utvRouteSkeletonCard" />
          <div className="utvRouteSkeleton utvRouteSkeletonCard" />
          <div className="utvRouteSkeleton utvRouteSkeletonCard" />
        </div>

        <div className="utvRouteSkeleton utvRouteSkeletonLine" />
        <div className="utvRouteSkeleton utvRouteSkeletonLine short" />
      </section>
    </main>
  );
}
