using Microsoft.AspNetCore.Mvc;

namespace airsafenet_backend.Controllers
{
    public class AuthController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
