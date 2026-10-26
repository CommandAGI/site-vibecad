import type {VibeCADMode} from '@/lib/studio/vibecad-character';

/** Six articulated ceramic plates around a dark chassis. CSS handles all motion. */
export default function VibeCADFace({small=false,mode='idle'}:{small?:boolean;mode?:VibeCADMode}){
 return <span className={`vibecad-character${small?' vibecad-character--small':''}`} data-mode={mode} aria-hidden="true">
  <span className="vibecad-character-shadow"/>
  <span className="vibecad-character-float"><span className="vibecad-cube">
   <span className="vibecad-chassis"/>
   <span className="vibecad-plate vibecad-plate--back"/>
   <span className="vibecad-plate vibecad-plate--bottom"><i/><i/></span>
   <span className="vibecad-plate vibecad-plate--left"><span className="vibecad-panel-vents"><i/><i/><i/></span></span>
   <span className="vibecad-plate vibecad-plate--right"><span className="vibecad-panel-vents"><i/><i/><i/></span><b className="vibecad-panel-light"/></span>
   <span className="vibecad-plate vibecad-plate--top"><span className="vibecad-panel-mark">m</span><i className="vibecad-panel-groove"/></span>
   <span className="vibecad-plate vibecad-plate--front">
    <i className="vibecad-screw vibecad-screw--tl"/><i className="vibecad-screw vibecad-screw--tr"/>
    <span className="vibecad-optic"><span className="vibecad-optic-track"/><span className="vibecad-optic-glass"><span className="vibecad-optic-iris"><i/></span><b className="vibecad-scan-line"/></span></span>
    <span className="vibecad-face-indicator"><i/><i/><i/></span><small>01</small>
   </span>
   <span className="vibecad-probe"><span/><i/></span>
   <span className="vibecad-lens-arm"><span className="vibecad-lens"><i/></span></span>
   <span className="vibecad-foot vibecad-foot--left"/><span className="vibecad-foot vibecad-foot--right"/>
  </span></span>
 </span>;
}
