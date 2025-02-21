// Parameter definitions
const PIXELATE_STD_DEVIATION = 0; // Adjust this value for stronger/weaker blur
const PIXELATE_TABLE_VALUES = "0 0.25 0.5 1"; // Adjust these values for different quantization levels

(function() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svgEl = document.createElementNS(svgNS, "svg");
    svgEl.setAttribute("style", "position:absolute; width:0; height:0;");

    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "pixelate");

    // Blur the source graphic using parameterized stdDeviation
    const feGaussian = document.createElementNS(svgNS, "feGaussianBlur");
    feGaussian.setAttribute("in", "SourceGraphic");
    feGaussian.setAttribute("stdDeviation", PIXELATE_STD_DEVIATION);
    feGaussian.setAttribute("result", "blur");

    // Quantize the blurred image into discrete color bands
    const feComp = document.createElementNS(svgNS, "feComponentTransfer");
    feComp.setAttribute("in", "blur");
    feComp.setAttribute("result", "discrete");

    // Use parameterized table values on each color channel to create a blocky look
    const feFuncR = document.createElementNS(svgNS, "feFuncR");
    feFuncR.setAttribute("type", "discrete");
    feFuncR.setAttribute("tableValues", PIXELATE_TABLE_VALUES);
    const feFuncG = document.createElementNS(svgNS, "feFuncG");
    feFuncG.setAttribute("type", "discrete");
    feFuncG.setAttribute("tableValues", PIXELATE_TABLE_VALUES);
    const feFuncB = document.createElementNS(svgNS, "feFuncB");
    feFuncB.setAttribute("type", "discrete");
    feFuncB.setAttribute("tableValues", PIXELATE_TABLE_VALUES);

    feComp.appendChild(feFuncR);
    feComp.appendChild(feFuncG);
    feComp.appendChild(feFuncB);

    // Blend the quantized result over the original source to keep edges visible
    const feComposite = document.createElementNS(svgNS, "feComposite");
    feComposite.setAttribute("in", "discrete");
    feComposite.setAttribute("in2", "SourceGraphic");
    feComposite.setAttribute("operator", "in");

    filter.appendChild(feGaussian);
    filter.appendChild(feComp);
    filter.appendChild(feComposite);
    svgEl.appendChild(filter);
    document.body.appendChild(svgEl);

    // Apply the filter to the entire document
    document.documentElement.style.filter = "url(#pixelate)";
})();
