# Numerical Quadrature Laboratory v9: choosing the right integration method, not a single winner

I have completed another iteration of my **Numerical Quadrature Laboratory**, an executable Jupyter notebook that grew from a faithful Python port of Graeme Dennes's Excel/VBA Tanh-Sinh routine into a much broader numerical-integration test bed.

The current laboratory covers:

- faithful, vectorized and Numba-compiled Tanh-Sinh;
- adaptive Simpson and SciPy adaptive quadrature;
- Gauss-Legendre, Hermite, Laguerre and Jacobi;
- Clenshaw-Curtis;
- Golub-Welsch construction for classical, custom and discrete measures;
- direct periodic integration and FFT experiments;
- tensor cubature in 2D, 3D and 4D;
- Smolyak sparse cubature.

The basic idea remains simple:

$$
I=\int_a^b f(x)\,dx\approx\sum_{i=1}^{n}w_i f(x_i).
$$

The difficult part is choosing nodes and weights that fit the **shape, measure, smoothness and dimensionality** of the actual problem.

## Selected results

| Problem | Method | Absolute error | Median apply time | Practical reading |
|---|---:|---:|---:|---|
| Smooth finite interval | Cached Gauss-Legendre 128 | $3.00\times10^{-17}$ | 10.1 μs | Excellent default for smooth repeated work |
| Smooth finite interval | Clenshaw-Curtis 256 | $2.47\times10^{-17}$ | 11.6 μs | Equally strong, with nested Chebyshev structure |
| Square-root endpoint | Transformed Simpson | $1.11\times10^{-16}$ | 2.4 μs | A known analytical transform can dominate |
| Log endpoint | Faithful Tanh-Sinh | $1.11\times10^{-16}$ | 28.7 μs | Excellent endpoint-singularity specialist |
| Sharp interior peak | SciPy `quad` | $2.78\times10^{-17}$ | 86.5 μs | Adaptivity is valuable when a feature is localized |
| Planck integral | GW-Laguerre 48 | $4.44\times10^{-15}$ | 4.5 μs after setup | Matching the natural exponential weight pays |
| QHO Gaussian moment | GW-Hermite 32 | $1.33\times10^{-15}$ | 1.3 μs after setup | A natural fit for Gaussian-weighted expectations |
| Custom tail probability | GW 48 on tail interval | $7.92\times10^{-10}$ | 1.4 μs after setup | Building the rule on the actual region beats a global indicator |
| 2D smooth cubature | Tensor GW-Legendre, $n=8$ | $4.44\times10^{-15}$ | 64 points | Excellent for smooth bivariate work |
| 3D smooth cubature | Tensor GW-Legendre, $n=8$ | $1.24\times10^{-14}$ | 512 points | Still highly effective for trivariate work |
| 4D smooth cubature | Tensor GW-Legendre, $n=8$ | $3.91\times10^{-14}$ | 4,096 points | Accurate, but $n^d$ growth is now visible |

## What stood out

**1. Match the measure, not just the interval.**  
Gauss-Hermite, Laguerre and Jacobi are powerful because their weights already absorb the natural density or kernel. A correctly matched rule can turn an infinite-domain integral into a small weighted dot product.

**2. Tanh-Sinh remains a superb specialist.**  
For algebraic and logarithmic endpoint singularities, the faithful scalar implementation reached near machine precision without manually deriving a special transform.

**3. Custom Golub-Welsch rules are potentially very useful in a quant toolbox.**  
For a fixed positive custom distribution, we can build nodes and weights once, cache them, and reduce repeated expectations to

$$
\mathbb E[g(X)]\approx\sum_{i=1}^{n}w_i g(x_i).
$$

That is attractive for repeated scenario analysis, exposure functions, sensitivities and portfolio metrics under one calibrated measure.

But custom rules are not magic. A global Gaussian rule struggles with payoff kinks and indicator discontinuities. In the notebook, increasing a custom call rule from 48 to 128 points reduced error from **0.06092** to **0.009927**, but splitting at the strike remained the accurate reference. For a tail probability, building a 48-point rule directly on the tail interval reduced error to **$7.92\times10^{-10}$**.

**4. Parallelism belongs across independent integrals.**  
For 20,000 parameterized integrals, Numba parallel execution took **0.0395 s** against **0.1642 s** for compiled serial execution, a **4.16×** speed-up on 18 configured threads. A NumPy matrix implementation also accelerated 10,000 fixed Gauss-Legendre integrals by **3.20×** over a Python loop.

**5. Tensor cubature is excellent in low dimension, but the point count tells the story.**  
For the smooth analytic benchmark, tensor Gauss-Legendre was outstanding through 4D. Yet even $n=8$ grows from 64 points in 2D to 512 in 3D and 4,096 in 4D. Sparse grids use fewer points, but they trade away accuracy at lower levels. The right crossover depends on dimension, smoothness and the cost of one function evaluation.

## My current practical hierarchy

- **Smooth 1D finite interval:** cached Gauss-Legendre or Clenshaw-Curtis.
- **Endpoint singularity:** Tanh-Sinh, or a known analytical transform.
- **Unknown local peaks or irregular behaviour:** adaptive Gauss-Kronrod / SciPy `quad`.
- **Gaussian, exponential or Jacobi-weighted expectation:** use the matching Gaussian family.
- **Repeated expectations under one custom positive density:** precompute a custom Golub-Welsch rule and validate it across increasing order.
- **Bivariate and trivariate smooth integrals:** tensor Gaussian cubature is a strong first choice.
- **Four dimensions:** benchmark tensor rules against sparse grids and Sobol quasi-Monte Carlo.
- **Higher effective dimension:** dimension reduction, conditioning, sparse grids, QMC or Monte Carlo.
- **Full periodic convolution or many translated outputs:** FFT, after validating indexing, orientation and normalization.

One validation item remains intentionally visible: the asymmetric FFT-convolution comparison delivered a large speed-up but also a **0.04265 maximum discrepancy** against the direct implementation. That means the convention still needs correction before the FFT-convolution example can be treated as numerically validated. Keeping failed checks visible is part of the laboratory's purpose.

The main lesson is not that one quadrature rule wins. It is that integration becomes much faster and more reliable when we expose the structure first: transform singularities, split at kinks, match natural weights, cache reusable rules, reduce dimension, and only then optimize.

#NumericalMethods #QuantitativeFinance #Python #SciPy #NumPy #Numba #Quadrature #Cubature #GolubWelsch #TanhSinh #ClenshawCurtis #FFT #ComputationalFinance
