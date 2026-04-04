using Microsoft.AspNetCore.Mvc;

namespace airsafenet_backend.Controllers
{
    public class DashboardController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
