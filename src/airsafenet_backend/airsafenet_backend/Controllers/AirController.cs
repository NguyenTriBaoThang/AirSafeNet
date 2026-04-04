using Microsoft.AspNetCore.Mvc;

namespace airsafenet_backend.Controllers
{
    public class AirController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
