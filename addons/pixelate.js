// Parameter definitions
const PIXELATE_STD_DEVIATION = 2; // Adjust this value for stronger/weaker blur
const PIXELATE_TABLE_VALUES = "0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.2, 0.21, 0.22, 0.23, 0.24, 0.25, 0.26, 0.27, 0.28, 0.29, 0.3, 0.31, 0.32, 0.33, 0.34, 0.35, 0.36, 0.37, 0.38, 0.39, 0.4, 0.41, 0.42, 0.43, 0.44, 0.45, 0.46, 0.47, 0.48, 0.49, 0.5, 0.51, 0.52, 0.53, 0.54, 0.55, 0.56, 0.57, 0.58, 0.59, 0.6, 0.61, 0.62, 0.63, 0.64, 0.65, 0.66, 0.67, 0.68, 0.69, 0.7, 0.71, 0.72, 0.73, 0.74, 0.75, 0.76, 0.77, 0.78, 0.79, 0.8, 0.81, 0.82, 0.83, 0.84, 0.85, 0.86, 0.87, 0.88, 0.89, 0.9, 0.91, 0.92, 0.93, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1"; // Basically colors, i don't know how to explain this, but more values = more colors

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
