using Microsoft.AspNetCore.Mvc;

namespace airsafenet_backend.Controllers
{
    public class UserPreferencesController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
